'use strict';

// Add jsonParse for IE
// Add jsonParse for IE
// Add jsonParse for IE
// Add jsonParse for IE

// check if ie11

var isIE11 = !!window.MSInputMethodContext && !!document.documentMode;

var rx_one = /^[\],:{}\s]*$/;
var rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
var rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
var rx_four = /(?:^|:|,)(?:\s*\[)+/g;
var rx_escapable = /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
var rx_dangerous = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;


var jasonParser = function(text, reviver) {

    var j;

    function walk(holder, key) {

        var k;
        var v;
        var value = holder[key];
        if (value && typeof value === "object") {
            for (k in value) {
                if (Object.prototype.hasOwnProperty.call(value, k)) {
                    v = walk(value, k);
                    if (v !== undefined) {
                        value[k] = v;
                    } else {
                        delete value[k];
                    }
                }
            }
        }
        return reviver.call(holder, key, value);
    }

    text = String(text);
    rx_dangerous.lastIndex = 0;
    if (rx_dangerous.test(text)) {
        text = text.replace(rx_dangerous, function(a) {
            return (
                "\\u" +
                ("0000" + a.charCodeAt(0).toString(16)).slice(-4)
            );
        });
    }

    if (
        rx_one.test(
            text
            .replace(rx_two, "@")
            .replace(rx_three, "]")
            .replace(rx_four, "")
        )
    ) {


        j = eval("(" + text + ")");


        return (typeof reviver === "function") ?
            walk({
                "": j
            }, "") :
            j;
    }



    // throw new SyntaxError("JSON.parse");
};
// Add jsonParse for IE
// Add jsonParse for IE
// Add jsonParse for IE
// Add jsonParse for IE

// DATA
var locations;
var markerLocations;
var saveMarkerLocations;
var sessionsLocations;
var getFieldValues;
var fields;
var urlForm = '/register'; // The form used for registration (wich will be improved with datas collected when user click on a session subscription button (see line 'redirect the user to the form'))
var urlLocations = '/media/microsite/inveest/ssm/json/locations.json'; // The database containing all existing trainings for the microsite
var of ;
var ville;
var date_debut;
var date_fin;
var course_id;
var session_id;
var enrollment_action;
var markerSaved;

// Data Base loading, as a callback of googleapis. When DB is loaded, we show the map and the filters bar
var startAPI = function() {
    var getLocations = new Promise(function(resolve, reject) {
        var requestURL = urlLocations;
        var request = new XMLHttpRequest();
        request.open('GET', requestURL);
        request.responseType = 'json';
        request.send();
        request.onload = function() {
           
			
			if (isIE11==true){
			locations = JSON.stringify(request.response);
            locations = jasonParser(locations)
            locations = jasonParser(locations)
			console.log("ie11")
			}
			else{
			locations = request.response
			}
			
            // locations =  locations.string.split(",").map(Number);
            // console.log(locations)
            // console.log(typeof(locations))
            resolve(setDatas());
        }
    });
}

// This is a callback of startAPI(), wich show the API with a fully loaded DB containing all locations
var setDatas = function() {
    markerLocations = locations;

    saveMarkerLocations = JSON.parse(JSON.stringify(markerLocations));

    sessionsLocations = (function() {
        var buildASession = function(i, j) {
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

    getFieldValues = function(field) {
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
        var fields = function(values) {
            var fieldsList = [];
            for (var i = 0; i < values.length; i++) {
                fieldsList.push({
                    label: values[i],
                    name: values[i]
                })
            }
            return fieldsList
        }
        return fields(values);
    };

    fields = [{
            label: 'Région',
            name: 'region',
            values: getFieldValues('region'),
            type: 'select'
        },
        {
            label: 'Département',
            name: 'departement',
            values: getFieldValues('departement'),
            type: 'select'
        },
        {
            label: 'Organisme',
            name: 'nom',
            values: getFieldValues('nom'),
            type: 'select'
        },
        {
            label: 'Date',
            type: 'dateRangePicker',
            name: 'datepicker'
        },
    ];
    buildSearchBar(fields);
    $('#datepicker').val('');
    $('.cancelBtn').html('Annuler');
    $('.applyBtn').html('Valider');
    launchSearch();
};


// FUNCTIONS
var launchSearch = function() {
    // First filtering, that generate one result (location) per session
    locations = filterData();
    displayResults(locations);
    // There is is a second filtering exclusively for markers, because we do not want a marker for each session, only one marker for each training (wich contains X sessions)
    markerLocations = filterMarkers();
    initMap();
}

var sortByAlphabet = function(list, property) {
    if (!list || !list[0]) {
        return false
    }
    if (property) {
        if (typeof property === 'string') {
            list.sort(function(a, b) {
                return a[property].localeCompare(b[property]);
            });
        } else if (typeof property === 'number') {
            list.sort(function(a, b) {
                return a[property] - b[property];
            });
        }
    } else {
        list.sort();
    }
}

function buildSearchBar(fields) {
    fields.map(function(field) {
        sortByAlphabet(field.values, 'name');
        if (field.type === 'select') {
            var fieldInput = '<div class="col-lg-2 col-md-12 col-sm-12 inputWrapper nineLeft"> <select class="custom-select mb-3" id="' + field.name + '"><option value="' + field.name + '">' + field.label + '</option>';
            field.values.map(function(value) {
                fieldInput += '<option value="' + value.name + '">' + value.label + '</option>'
            })
            fieldInput += '</select>';
            $('#datePickerWrap').after(fieldInput);
        } else if (field.type === 'dateRangePicker') {
            $('#datePickerWrap').removeClass('hide');
        }
    })
    var updateReinitializer = function() {
        if ($('#region')[0].value !== 'region' || $('#departement')[0].value !== 'departement' || $('#nom')[0].value !== 'nom' || $('#datepicker')[0].value !== '') {
            $('#reinitializer')[0].style.display = 'block';
        } else {
            $('#reinitializer')[0].style.display = 'none';
        }
    }
    $('select').change(function() {
        updateReinitializer();
    })
    $('#datepicker').change(function() {
        updateReinitializer();
    })
    $('#reinitializer').click(function() {
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
        center: {
            lat: 46.8534,
            lng: 2.3488
        }
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
                url: '/media/microsite/inveest/ssm/icons/trainingIcon.svg', // url
                scaledSize: new google.maps.Size(30, 30), // scaled size
                origin: new google.maps.Point(0, 0), // origin
                anchor: new google.maps.Point(15, 30), // anchor
                labelOrigin: new google.maps.Point(15, 13), // label offset
            },
        });
    });

    // create popup on markers
    (function() {
        // popup contents for markers
        var contentString = function(marker) {
            if (marker) {

                markerSaved = marker;
                console.log(markerSaved)

                // We create a liste with every sessions possible for the training
                var getDatesList = function(dates) {
                    var list = '<ul id="markerTrainingDates">';
                    for (var i = 0; i < dates.length; i++) {
                        list += '<li>Session du ' + dates[i].periode.debut + ' au ' + dates[i].periode.fin;
                        // PUT HERE SOME TEST TO CHECK IF REGISTRATION DATE STILL OK /!\
                        if (true) {
                            list += '<span style="color:green"> inscriptions ouvertes</span>' +
                                '<div id="markerRegistration">' +
                                '<button id="subscribeMarker' + i + '" class="secondColorBg mainColor textBold">S\'inscrire</button>' +
                                '</div>';
                        } else {
                            list += '<span style="color:red> inscriptions fermées</span>';
                        }
                        list += '</li>';
                    }
                    list += '</ul>'
                    return list
                };

                var content = '<div id="content">';
                content +=
                    '</div>' +
                    '<h1 id="markerFirstHeading">' + marker.of.nom + ' <span>(' + marker.sites.adresse.region + ')</span></h1>' +
                    '<div id="markerBodyContent">' +
                    '<div id="markerRegisterInfos">' +
                    getDatesList(marker.sessions) +
                    '</div>' +
                    '</div>';
                content +=
                    '<div id="markerLocationInfos">' +
                    '<img src="/media/microsite/inveest/ssm/icons/trainingIcon.svg" alt="icône bleu de localisation" height="15px" width="15px" top="-5px"/>' +
                    '<p id="markerTown">' + marker.sites.adresse.ville + '</p>' +
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
        var infowindow = function(marker) {
            return new google.maps.InfoWindow({
                content: contentString(marker)
            });
        }

        // show popup on marker click.
        for (var i = 0; i < markers.length; i++) {
            console.log(i);
            setMarkerClickable(markers[i], markerLocations[i], infowindow);
        }
    })();
    // Add a marker clusterer to manage the markers.
    var markerCluster = new MarkerClusterer(map, markers, {
        imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'
    });
}

var setMarkerClickable = function (marker, markerLocation, infowindow) {
    var clickedMarker;
    marker.addListener('click', function() {
        console.log(marker);
        if (clickedMarker) {
            clickedMarker.close();
        }
        clickedMarker = infowindow(markerLocation);
        clickedMarker.open(map, marker);

        google.maps.event.addListener(clickedMarker, 'domready', function() {
            for (var j = 0; j < markerSaved.sessions.length; j++) {
                var thisClickedSession = JSON.parse(JSON.stringify(markerSaved));
                thisClickedSession.sessions = markerSaved.sessions[j];
                displayRegistration('#subscribeMarker' + j, thisClickedSession);
            }
        });
    });
}

var momentification = function(date) {
    date = date.split('/');
    date = date[2] + '-' + date[1] + '-' + date[0];
    return date
}

// Filtering the list of sessions for a search
function filterData() {
    var dataToFilter = sessionsLocations;

    var selectedFilters = [];
    fields.map(function(field) {
        var fieldSearchValue = $('#' + field.name).val();
        selectedFilters.push({
            name: field.name,
            value: fieldSearchValue
        })
    })
    // console.log(selectedFilters)
    var selectedLocations = dataToFilter.filter(function(location) {
        var validLocation = true;
        selectedFilters.map(function(filter) {
            //Avoid cases where field is datepicker type / search field value = search field name => means all results
            if (filter.name !== "datepicker" && filter.name != filter.value && (location.of[filter.name] !== filter.value && location.sites.adresse[filter.name] !== filter.value)) {
                validLocation = false;
            } else if (filter.name === "datepicker" && filter.value !== "" && location.sessions.periode && location.sessions.periode.debut) {
                var date1 = filter.value.split(' - ')[0];
                date1 = momentification(date1);
                var date2 = filter.value.split(' - ')[1];
                date2 = momentification(date2);
                var locationDate = momentification(location.sessions.periode.debut);
                if (moment(locationDate).isBefore(date1) || moment(locationDate).isAfter(date2)) {
                    validLocation = false;
                }
            }
        })
        return validLocation;
    })
    return selectedLocations;
}

// Filtering the list of marker for a search
function filterMarkers() {
    var dataToFilter = saveMarkerLocations;

    var selectedFilters = [];
    fields.map(function(field) {
        var fieldSearchValue = $('#' + field.name).val();
        selectedFilters.push({
            name: field.name,
            value: fieldSearchValue
        })
    })
    // console.log(selectedFilters)
    var selectedLocations = dataToFilter.filter(function(location) {
        var validLocation = true;
        selectedFilters.map(function(filter) {

            if (filter.name !== "datepicker") {
                if (filter.name != filter.value && (location.of[filter.name] !== filter.value && location.sites.adresse[filter.name] !== filter.value)) {
                    validLocation = false;
                }
            }

            if (filter.name === "datepicker" && filter.value !== "") {
                var testDates = false;
                var date1 = filter.value.split(' - ')[0];
                date1 = momentification(date1);
                var date2 = filter.value.split(' - ')[1];
                date2 = momentification(date2);
                var locationDate;

                // Check in every dates (j) if there at least one date wich is OK with the search, if not, return false
                for (var j = 0; j < location.sessions.length; j++) {
                    locationDate = momentification(location.sessions[j].periode.debut);
                    if (moment(locationDate).isAfter(date1) && moment(locationDate).isBefore(date2)) {
                        testDates = true;
                    }
                }
                if (!testDates) {
                    validLocation = false;
                }
            }
        })
        return validLocation;
    })
    return selectedLocations;
}

function displayResults(selectedLocations) {
    if (selectedLocations.length > 0) {
        // Sort the list by date in ascending order
        selectedLocations.sort(function(a, b) {
            var dateA = a.sessions.periode.debut;
            var dateB = b.sessions.periode.debut;
            dateA = dateA.split("/");
            dateB = dateB.split("/");
            dateA = dateA[1] + "/" + dateA[0] + "/" + dateA[2];
            dateB = dateB[1] + "/" + dateB[0] + "/" + dateB[2];
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
                sessionsByMonthList.push({
                    month: month,
                    year: year,
                    session: [selectedLocations[i]]
                });
            } else {
                sessionsByMonthList[sessionsByMonthList.length - 1].session.push(selectedLocations[i]);
            }
        }

        $('#results').html('(' + selectedLocations.length + ')');
        var index = 0;
        sessionsByMonthList.map(function(sessionsInAMonth) {
            var monthLabel =
                '<div class="monthBar">' +
                '<h4>' +
                moment().month(sessionsInAMonth.month - 1).format("MMMM").toUpperCase() + ' ' + sessionsInAMonth.year +
                '</h4>' +
                '</div>';
            $('#results').append(monthLabel)
            for (var i = 0; i < sessionsInAMonth.session.length; i++) {
                var session = sessionsInAMonth.session[i];
                index++;
                var id = 'subscribe' + index;
                var openRegistration =
                    '<div id="subInfos" class="col-lg-4  col-md-12 col-sm-12">' +
                    '<img src="/media/microsite/inveest/ssm/icons/error.svg" alt="croix blanche sur rond rouge" height="25px" width="25px"/>' +
                    '<h6 style="color:red"">inscriptions fermées</h6>';
                '</div>';
                // PUT HERE SOME TEST TO CHECK IF REGISTRATION DATE STILL OK /!\
                if (true) {
                    openRegistration =
                        '<div id="subInfos" class="col-lg-4 col-md-12 col-sm-12">' +
                        '<img src="/media/microsite/inveest/ssm/icons/checked.svg" alt="v blanc sur rond vert" height="25px" width="25px"/>' +
                        '<h6 style="color:green">inscriptions ouvertes</h6>' +
                        '<button id=' + id + ' class="secondColorBg mainColor textBold">S\'inscrire</button>' +
                        '</div>'; 
                }
                var courseReview =
                    '<div class="cardStye row" >' +
                    '<div class="col-lg-1  col-md-12 col-sm-12"><img src="/media/microsite/inveest/ssm/icons/presentation.svg" alt="icône de personnage faisant une présentation sur un tableau" height="50px" width="50px"/></div>' +
                    '<div class="col-lg-2  col-md-12 col-sm-12"><h6 class="whiteH6">Session du ' + session.sessions.periode.debut + ' au ' + session.sessions.periode.fin + '</h6></div>' +
                    '<div id="titleAndRegion" class= "col-lg-3  col-md-12 col-sm-12 >' +
                    '<h6 class="whiteH6">' + session.of.nom + ' </h6>' +
                    '<p>' + session.sites.adresse.region + '</p>' +
                    '</div>' +
                    '<div id="markerAndTown" class="col-lg-2  col-md-12 col-sm-12" >' +
                    '<img src="/media/microsite/inveest/ssm/icons/trainingIcon.svg" alt="icône bleu de localisation" height="25px" width="25px"/>' +
                    '<h6>' + session.sites.adresse.ville + '</h6>' +
                    '</div>' +
                    openRegistration +
                    '</div></div>';
                $('#results').append(courseReview)
                // PUT HERE SOME TEST TO CHECK IF REGISTRATION DATE STILL OK /!\
                if (true) {
                    displayRegistration('#' + id, session);
                }
            }
        })
    } else {
        $('#results').html('<p>Aucun résultat ne correspond à votre recherche.</p>');
    }
    $('#resultsWrapper').removeClass('hide');
}

// ACTIONS
$("#search").on('click', function() {
    launchSearch();
});

// Sending data collected by the user clicking on a session
var displayRegistration = function(id, registration) {
    $(id).on('click', function() {

        of = registration.of.nom;
        ville = registration.sites.adresse.ville;
        course_id = registration.sessions.course_id;
        session_id = registration.sessions.id;
        enrollment_action = registration.sessions.enrollment_action;
        date_debut = registration.sessions.periode.debut;
        date_fin = registration.sessions.periode.fin
        // redirect the user to the form
        window.location.href = urlForm + '?of=' + of +'&session_id=' + session_id + '&course_id=' + course_id + '&enrollment_action=' + enrollment_action + '&ville=' + ville + '&date_debut=' + date_debut + '&date_fin=' + date_fin;
    });
}