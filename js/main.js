'use strict';

// DATA
var locations;
var markerLocations;
var saveMarkerLocations;
var sessionsLocations;
var getFieldValues;
var fields;
var urlForm = '/register'; // The form used for registration (wich will be improved with datas collected when user click on a session subscription button (see line 'redirect the user to the form'))
var urlLocations = '/media/microsite/inveest/search-sessions-map/json/locations.json'; // The database containing all existing trainings for the microsite
var of;
var ville;
var date_debut;
var date_fin;
var course_id;
var session_id;
var enrollment_action;

// Data Base loading, as a callback of googleapis. When DB is loaded, we show the map and the filters bar
var startAPI = function () {
  var getLocations = new Promise(function(resolve, reject) {
    var requestURL = urlLocations;
    var request = new XMLHttpRequest();
    request.open('GET', requestURL);
    request.responseType = 'json';
    request.send();
    request.onload = function() {
      locations = request.response;
      resolve(setDatas());
    }
  });
}

// This is a callback of startAPI(), wich show the API with a fully loaded DB containing all locations
var setDatas = function () {
  markerLocations = locations;

  saveMarkerLocations = JSON.parse(JSON.stringify(markerLocations));

  sessionsLocations = (function () {
    var buildASession = function (i, j) {
      var oneSession = JSON.parse(JSON.stringify(locations[i]));
      oneSession.sessions = locations[i].sessions[j];
      return oneSession
    };

    var sessions = [];
    for (var i = 0; i < locations.length; i++) {
      for (var j = 0; j < locations[i].sessions.length; j++) {
        sessions.push(buildASession(i, j));
      };
    }
    return sessions
  })();

  getFieldValues = function (field) {
    var values = [];
    for (var i = 0; i < locations.length; i++) {
      var alreadyExist = false;
      for (var j = 0; j < values.length; j++) {
        if (values[j] === locations[i].sites.adresse[field] || values[j] === locations[i].of[field]) {
          alreadyExist = true;
        }
      }
      if (!alreadyExist) {
        if (field === 'nom') {
          values.push(locations[i].of[field]);
        } else {
          values.push(locations[i].sites.adresse[field]);
        }
      }
    }
    var fields = function (values) {
      var fieldsList = [];
      for (var i = 0; i < values.length; i++) {
        fieldsList.push({label:values[i], name:values[i]})
      }
      return fieldsList
    }
    return fields(values);
  };

  fields=[
    {
      label:'Région',
      name:'region',
      values:getFieldValues('region'),
      type:'select'
    },
    {
      label:'Département',
      name:'departement',
      values:getFieldValues('departement'),
      type:'select'
    },
    {
      label:'Organisme',
      name:'nom',
      values:getFieldValues('nom'),
      type:'select'
    },
    {
      label:'Date',
      type:'dateRangePicker',
      name:'datepicker'
    },
  ];
  buildSearchBar(fields);
  $('#datepicker').val('');
  $('.cancelBtn').html('Annuler');
  $('.applyBtn').html('Valider');
  launchSearch();
};


// FUNCTIONS
var launchSearch = function () {
  // First filtering, that generate one result (location) per session
  locations = filterData();
  displayResults(locations);
  // There is is a second filtering exclusively for markers, because we do not want a marker for each session, only one marker for each training (wich contains X sessions)
  markerLocations = filterMarkers();
  initMap();
}

var sortByAlphabet = function (list, property) {
  if (!list || !list[0]) {
    return false
  }
  if (property) {
    if (typeof property === 'string') {
      list.sort(function (a, b) {
        return a[property].localeCompare(b[property]);
      });
    } else if (typeof property === 'number') {
      list.sort(function (a, b) {
        return a[property] - b[property];
      });
    }
  } else {
    list.sort();
  }
}

function buildSearchBar(fields){
  fields.map(function(field){
    sortByAlphabet(field.values, 'name');
    if(field.type === 'select'){
      var fieldInput='<div class="col-md-2 inputWrapper"> <select class="custom-select mb-3" id="'+field.name+'"><option value="'+field.name+'">'+field.label+'</option>';
      field.values.map(function (value) {
        fieldInput+='<option value="'+value.name+'">'+value.label+'</option>'
      })  
      fieldInput+='</select>';
      $('#searchCourses .row').append(fieldInput);
    }
    else if(field.type==='dateRangePicker'){
    $('#datePickerWrap').removeClass('hide'); 
    }
  })
  var updateReinitializer = function () {
    if ($('#region')[0].value !== 'region' || $('#departement')[0].value !== 'departement' || $('#nom')[0].value !== 'nom' || $('#datepicker')[0].value !== ''){
      $('#reinitializer')[0].style.display = 'initial';
    } else {
      $('#reinitializer')[0].style.display = 'none';
    }
  }
  $('select').change(function () {
    updateReinitializer();
  })
  $('#datepicker').change(function () {
    updateReinitializer();
  })
  $('#reinitializer').click(function () {
    $('#region')[0].value = 'region';
    $('#departement')[0].value = 'departement';
    $('#nom')[0].value = 'nom';
    $('#datepicker')[0].value = '';
    $('#reinitializer')[0].style.display = 'none';
    launchSearch();
  })
}

function initMap() {
  var map = new google.maps.Map(document.getElementById('map'), {
    zoom: 5,
    center: {lat: 46.8534, lng: 2.3488}
  });

  // Create an array of alphabetical characters used to label the markers.
  var labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // Add some markers to the map.
  // Note: The code uses the JavaScript Array.prototype.map() method to
  // create an array of markers based on a given "locations" array.
  // The map() method here has nothing to do with the Google Maps API.
  var markers = markerLocations.map(function(location, i) {
    return new google.maps.Marker({
      position: location.sites.position,
      map: map,
      label: {
        text: labels[i % labels.length],
        color: 'black',
        fontSize: '10px'
      },
      icon: {
        url: './icons/trainingIcon.svg', // url
        scaledSize: new google.maps.Size(30, 30), // scaled size
        origin: new google.maps.Point(0, 0), // origin
        anchor: new google.maps.Point(15, 30), // anchor
        labelOrigin: new google.maps.Point(15, 13), // label offset
      },
    });
  });

  // create popup on markers
  (function (){
    var markerSaved;
    // popup contents for markers
    var contentString = function (marker) {
      if (marker) {

        markerSaved = marker;

        // We create a liste with every sessions possible for the training
        var getDatesList = function (dates) {
          var list = '<ul id="markerTrainingDates">';
          for (var i = 0; i < dates.length; i++) {
            list += '<li>Session du ' + dates[i].periode.debut + ' au ' + dates[i].periode.fin;
            // PUT HERE SOME TEST TO CHECK IF REGISTRATION DATE STILL OK /!\
            if (true) {
              list += '<span style="color:green"> inscriptions ouvertes</span>'+
              '<div id="markerRegistration">'+
                '<button id="subscribeMarker'+i+'" class="secondColorBg mainColor textBold">S\'inscrire</button>'+
              '</div>';
            } else {
              list += '<span style="color:red> inscriptions fermées</span>';
            }
            list +=  '</li>';
          }
          list += '</ul>'
          return list
        };

        var content = '<div id="content">';
          content +=
          '</div>'+
          '<h1 id="markerFirstHeading">' + marker.of.nom + ' <span>(' + marker.sites.adresse.region + ')</span></h1>'+
          '<div id="markerBodyContent">'+
          '<div id="markerRegisterInfos">'+
          getDatesList(marker.sessions)+
          '</div>'+
          '</div>';
        content +=
        '<div id="markerLocationInfos">'+
        '<img src="./icons/trainingIcon.svg" alt="icône bleu de localisation" height="15px" width="15px" top="-5px"/>'+
        '<p id="markerTown">' + marker.sites.adresse.ville + '</p>'+
        // '<div id="markerDetails">' +
        // '<p>' + marker.adresse + '</p>'+
        // '<p> tel : ' + marker.sites.tel + '</p>'+
        // '</div>'+
        '</div>';

        return content
      } else {
        return 'ERROR marker does not exist'
      }
    };

    // create content for marker when clicked
    var infowindow = function (marker) {
      return new google.maps.InfoWindow({
      content: contentString(marker)
      });
    }

    // show popup on marker click.
    var clickedMarker;
    for (let i=0; i < markers.length; i++) {
      var marker = markers[i];
      markers[i].addListener('click', function() {
        if (clickedMarker) {
          clickedMarker.close();
        }
        clickedMarker = infowindow(markerLocations[i]);
        clickedMarker.open(map, markers[i]);

        google.maps.event.addListener(clickedMarker,'domready',function() {
          for (let j = 0; j < markerSaved.sessions.length; j++) {
            var thisClickedSession = JSON.parse(JSON.stringify(markerSaved));
            thisClickedSession.sessions = markerSaved.sessions[j];
            displayRegistration('#subscribeMarker'+j, thisClickedSession);
          }
        });
      });
    }
  })();
  // Add a marker clusterer to manage the markers.
  var markerCluster = new MarkerClusterer(map, markers,
  {imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'});
}

var momentification = function (date) {
  date=date.split('/');
  date=date[2]+'-'+date[1]+'-'+date[0];
  return date
}

// Filtering the list of sessions for a search
function filterData(){
  var dataToFilter = sessionsLocations;

  var selectedFilters=[];  
  fields.map(function(field){
    var fieldSearchValue = $('#'+field.name).val();
    selectedFilters.push({name:field.name, value:fieldSearchValue})
  })
  // console.log(selectedFilters)
  var selectedLocations = dataToFilter.filter(function(location){
    var validLocation=true;
    selectedFilters.map(function(filter){
      //Avoid cases where field is datepicker type / search field value = search field name => means all results
      if(filter.name!=="datepicker" && filter.name!=filter.value && (location.of[filter.name]!==filter.value && location.sites.adresse[filter.name]!==filter.value)){
        validLocation=false;
      }
      else if(filter.name==="datepicker" && filter.value!=="" && location.sessions.periode && location.sessions.periode.debut){
        var date1=filter.value.split(' - ')[0];
        date1 = momentification(date1);
        var date2=filter.value.split(' - ')[1];
        date2 = momentification(date2);
        var locationDate = momentification(location.sessions.periode.debut);
        if(moment(locationDate).isBefore(date1) || moment(locationDate).isAfter(date2)){
          validLocation=false;
        }
      }
    })
    return validLocation;
  })
  return selectedLocations;
}

// Filtering the list of marker for a search
function filterMarkers(){
  var dataToFilter = saveMarkerLocations;

  var selectedFilters=[];  
  fields.map(function(field){
    var fieldSearchValue = $('#'+field.name).val();
    selectedFilters.push({name:field.name, value:fieldSearchValue})
  })
  // console.log(selectedFilters)
  var selectedLocations = dataToFilter.filter(function(location){
    var validLocation=true;
    selectedFilters.map(function(filter){
      
      if (filter.name!=="datepicker") {
        if(filter.name!=filter.value && (location.of[filter.name]!==filter.value && location.sites.adresse[filter.name]!==filter.value)){
          validLocation=false;
        }
      }
      
      if(filter.name==="datepicker" && filter.value!==""){
        var testDates = false;
        var date1=filter.value.split(' - ')[0];
        date1 = momentification(date1);
        var date2=filter.value.split(' - ')[1];
        date2 = momentification(date2);
        var locationDate;

        // Check in every dates (j) if there at least one date wich is OK with the search, if not, return false
        for (let j = 0; j < location.sessions.length; j++) {
          locationDate = momentification(location.sessions[j].periode.debut);
          if(moment(locationDate).isAfter(date1) && moment(locationDate).isBefore(date2)){
            testDates=true;
          }
        }
        if(!testDates){
          validLocation=false;
        }
      }
    })
    return validLocation;
  })
  return selectedLocations;
}

function displayResults(selectedLocations){
  if(selectedLocations.length>0){
    // Sort the list by date in ascending order
    selectedLocations.sort(function(a, b) {
      var dateA = a.sessions.periode.debut;
      var dateB = b.sessions.periode.debut;
      dateA = dateA.split("/");
      dateB = dateB.split("/");
      dateA = dateA[1]+"/"+dateA[0]+"/"+dateA[2];
      dateB = dateB[1]+"/"+dateB[0]+"/"+dateB[2];
      dateA = new Date(dateA).getTime();
      dateB = new Date(dateB).getTime();
      return dateA - dateB;
    });

    // Creating month labels
    var sessionsByMonthList = [];
    for (var i = 0; i < selectedLocations.length; i++) {
      var date = selectedLocations[i].sessions.periode.debut;
      date = date.split("/");
      var month = date[1];
      var year = date[2];
      if (sessionsByMonthList.length === 0 || month !== sessionsByMonthList[sessionsByMonthList.length - 1].month || year !== sessionsByMonthList[sessionsByMonthList.length - 1].year) {
        sessionsByMonthList.push({month: month, year: year, session: [selectedLocations[i]]});
      } else {
        sessionsByMonthList[sessionsByMonthList.length - 1].session.push(selectedLocations[i]);
      }
    }

    $('#results').html('(' + selectedLocations.length + ')');
    var index = 0;
    sessionsByMonthList.map(function(sessionsInAMonth){
      var monthLabel =
      '<div class="monthBar">'+
        '<h4>'+
          moment().month(sessionsInAMonth.month - 1).format("MMMM").toUpperCase()+' '+sessionsInAMonth.year+
        '</h4>'+
      '</div>';
      $('#results').append(monthLabel)
      for (let i = 0; i < sessionsInAMonth.session.length; i++) {
        var session = sessionsInAMonth.session[i];
        index++;
        var id = 'subscribe' + index;
        var openRegistration =
          '<div id="subInfos">'+
          '<img src="./icons/error.svg" alt="croix blanche sur rond rouge" height="25px" width="25px"/>'+
          '<h6 style="color:red"">inscriptions fermées</h6>';
          '</div>';
        // PUT HERE SOME TEST TO CHECK IF REGISTRATION DATE STILL OK /!\
        if (true) {
          openRegistration =
          '<div id="subInfos">'+
          '<img src="./icons/checked.svg" alt="v blanc sur rond vert" height="25px" width="25px"/>'+
          '<h6 style="color:green">inscriptions ouvertes</h6>'+
          '<button id='+id+ ' class="secondColorBg mainColor textBold">S\'inscrire</button>'+
          '</div>';
        }
        var courseReview =
        '<div class="card" >'+
        '<img src="./icons/presentation.svg" alt="icône de personnage faisant une présentation sur un tableau" height="50px" width="50px"/>'+
        '<h6>Session du '+session.sessions.periode.debut+' au '+session.sessions.periode.fin+'</h6>'+
        '<div id="titleAndRegion" >'+
        '<h6>'+session.of.nom+' </h6>'+
        '<p>'+session.sites.adresse.region+'</p>'+
        '</div>'+
        '<div id="markerAndTown" >'+
        '<img src="./icons/trainingIcon.svg" alt="icône bleu de localisation" height="25px" width="25px"/>'+
        '<h6>'+session.sites.adresse.ville+'</h6>'+
        '</div>'+
        openRegistration+
        '</div></div>';
        $('#results').append(courseReview)
        // PUT HERE SOME TEST TO CHECK IF REGISTRATION DATE STILL OK /!\
        if (true) {
          displayRegistration('#' + id, session);
        }
      }
    })
  }
  else{
    $('#results').html('<p>Aucun résultat ne correspond à votre recherche.</p>');
  }
  $('#resultsWrapper').removeClass('hide');
}

// ACTIONS
$("#search").on('click', function(){
  launchSearch();
});

// Sending data collected by the user clicking on a session
var displayRegistration = function (id, registration) {
  $(id).on('click', function(){

    of = registration.of.nom;
    ville = registration.sites.adresse.ville;
    course_id = registration.sessions.course_id;
    session_id = registration.sessions.id;
    enrollment_action = registration.sessions.enrollment_action;
    date_debut = registration.sessions.periode.debut;
    date_fin = registration.sessions.periode.fin;

    console.log(urlForm + '?of=' + of + '&session_id=' + session_id + '&course_id=' + course_id + '&enrollment_action=' + enrollment_action + '&ville=' + ville + '&date_debut=' + date_debut + '&date_fin=' + date_fin);

    // redirect the user to the form
    window.open(urlForm + '?of=' + of + '&session_id=' + session_id + '&course_id=' + course_id + '&enrollment_action=' + enrollment_action + '&ville=' + ville + '&date_debut=' + date_debut + '&date_fin=' + date_fin);
  });
}
