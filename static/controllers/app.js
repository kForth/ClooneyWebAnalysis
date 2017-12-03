var app = angular.module('app', ['ngRoute', 'ngFileSaver', 'ngAnimate', 'ui.bootstrap', 'ngStorage', 'ui.sortable'])
    .config(function ($routeProvider, $locationProvider) {
        $locationProvider.html5Mode(false).hashPrefix('');
        $routeProvider
            .when('/', {
                templateUrl: '../../../static/views/pages/home.html',
                controller: 'HomeController'
            })
            .when('/a', {
                templateUrl: '../../../static/views/pages/event/home.html',
                controller: 'AnalysisHomeController'
            })
            .when('/a/a', {
                templateUrl: '../../../static/views/pages/event/averages.html',
                controller: 'AnalysisAveragesController'
            })
            .when('/a/i', {
                templateUrl: '../../../static/views/pages/event/insights.html',
                controller: 'AnalysisInsightsController'
            })
            .when('/a/m', {
                templateUrl: '../../../static/views/pages/event/matches.html',
                controller: 'AnalysisMatchesController'
            })
            .when('/a/e', {
                templateUrl: '../../../static/views/pages/event/entries.html',
                controller: 'AnalysisEntriesController'
            })
            .when('/s', {
                templateUrl: '../../../static/views/pages/settings/event_settings.html',
                controller: 'SettingsHomeController'
            })
            .when('/s/c', {
                templateUrl: '../../../static/views/pages/settings/edit_calculations.html',
                controller: 'SettingsCalculationsController'
            })
            .when('/setup', {
                templateUrl: '../../../static/views/pages/settings/event_setup.html',
                controller: 'SetupEventController'
            })
            .when('/sheets', {
                templateUrl: '../../../static/views/pages/sheets/home.html',
                controller: 'SheetsHomeController'
            })
            .when('/sheets/create', {
                templateUrl: '../../../static/views/pages/sheets/edit.html',
                controller: 'SheetsEditController',
                resolve: {
                    appPath: function ($route) {
                        return {'mode': 'create'};
                    }
                }
            })
            .when('/sheets/edit/:id', {
                templateUrl: '../../../static/views/pages/sheets/edit.html',
                controller: 'SheetsEditController',
                resolve: {
                    appPath: function ($route) {
                        return {'mode': 'edit', 'id': $route.current.params.id};
                    }
                }
            })
            .when('/login', {
                templateUrl: '../../../static/views/pages/user/login.html',
                controller: 'UserLoginController'
            })
            .when('/logout', {
                templateUrl: '../../../static/views/pages/user/login.html',
                controller: 'UserLogoutController'
            })
            .when('/register', {
                templateUrl: '../../../static/views/pages/user/register.html',
                controller: 'UserRegisterController'
            })
            .otherwise({
                redirectTo: '/'
            });
    });


app.directive('highlightTable', function ($location, $sessionStorage) {
    function link(scope) {
        if($sessionStorage.colours == undefined) $sessionStorage.colours = {};
        scope.colours = $sessionStorage.colours[$location.path()] || {};

        scope.$watch('colours', function() {
            $sessionStorage.colours[$location.path()] = scope.colours;
        });

        scope.$watch(function() {
            return angular.toJson($sessionStorage);
        }, function() {
            scope.colours = $sessionStorage.colours[$location.path()];
        });

        scope.cycleColour = function (event, index) {
            if (scope.colours[index] === undefined)
                scope.colours[index] = 0;
            if(event.shiftKey) {
                scope.colours[index] = 0;
            }
            else if(event.ctrlKey || event.metaKey) {
                scope.colours[index] -= 1;
            }
            else{
                scope.colours[index] += 1;
            }
        };
    }

    return {
        link: link,
        restrict: 'A'
    };
});

app.directive('multiSortTable', function ($location, $sessionStorage) {

    function link(scope) {
        if($sessionStorage.sorts == undefined) $sessionStorage.sorts = {};
        scope.sorts = $sessionStorage.sorts[$location.path()];
        if (scope.sorts === undefined)
            scope.sorts = [];

        scope.$watch('sorts', function() {
            $sessionStorage.sorts[$location.path()] = scope.sorts;
        });

        scope.$watch(function() {
            return angular.toJson($sessionStorage);
        }, function() {
            scope.sorts = $sessionStorage.sorts[$location.path()];
        });

        scope.sortData = function (event, key) {
            if (event.shiftKey) {
                scope.sorts = [];
            }
            if (scope.sorts.indexOf("-" + key) > -1) {
                if(event.ctrlKey || event.metaKey){
                    scope.sorts.splice(scope.sorts.indexOf(key), 1);
                }
                else {
                    scope.sorts[scope.sorts.indexOf("-" + key)] = key;
                }
            }
            else if (scope.sorts.indexOf(key) > -1) {
                if(event.ctrlKey || event.metaKey){
                    scope.sorts[scope.sorts.indexOf(key)] = "-" + key;
                }
                else {
                    scope.sorts.splice(scope.sorts.indexOf(key), 1);
                }
            }
            else {
                scope.sorts.push("-" + key);
            }
        };
    }

    return {
        link: link,
        restrict: 'A'
    };
});

app.factory('AuthenticationService', function ($http, $localStorage) {
    var service = {};

    service.Login = Login;
    service.SetCredentials = SetCredentials;
    service.GetUserSettings = GetUserSettings;
    service.ClearCredentials = ClearCredentials;
    service.isAuthorized = isAuthorized;

    return service;

    function Login(username, password, success_callback, fail_callback) {
        $http.post('/login', {username: username, password: password})
            .then(function (resp) {
                    SetCredentials(resp.data);
                    success_callback(resp);
                    GetUserSettings(username);
                },
                function (resp) {
                    fail_callback(resp);
                });

    }

    function GetUserSettings(username){
        $http.get('/get/user_settings/' + username)
            .then(function(response){
                $localStorage.userSettings = response.data;
            },
            function(ignored){
                console.error("Cannot get user settings");
            });
    }

    function SetCredentials(user) {
        $localStorage.currentUser = user;

        $http.defaults.headers.common['Authorization'] = user.key;
    }

    function ClearCredentials() {
        $localStorage.currentUser = undefined;
        $localStorage.userSettings = undefined;
        $http.defaults.headers.common.Authorization = '';
        GetUserSettings('');
    }

    function isAuthorized(min_level) {
        return $localStorage.currentUser != undefined && $localStorage.userSettings != undefined &&
            $localStorage.currentUser.user.role >= min_level;

    }
});

app.controller('ApplicationController', function ($scope, $rootScope, $localStorage, $sessionStorage, $location, $http, AuthenticationService) {
    $rootScope.data_loading = 0;
    AuthenticationService.GetUserSettings('');

    $scope.$on('$routeChangeStart', function () {
        $rootScope.data_loading = 0;
        $scope.tracking_input_data.event = ($sessionStorage.tracked_event === undefined ? undefined : $sessionStorage.tracked_event.info.data);
        if ($localStorage.currentUser != undefined) {
            $scope.user_data = $localStorage.currentUser;
        }
    });

    $scope.available_events = [];
    $scope.update_available_events = function () {
        $http.get('/get/available_events').then(function (resp) {
            $scope.available_events = resp.data;
        });
    };
    $scope.update_available_events();

    $scope.tracking_input_data = {
        'event': '',
        'team': ''
    };

    $scope.isNavCollapsed = true;
    $sessionStorage.tracked_event_okay = false;
    $scope.select_event_button = function () {
        if (typeof($scope.tracking_input_data.event) == 'object') {
            $http.get('/get/event/' + $scope.tracking_input_data.event.key)
                .then(function(resp){
                    $sessionStorage.tracked_event = resp.data;
                    $sessionStorage.tracked_event_okay = true;
                    $location.path('/a');
                },
                function(ignored){
                    console.error("Couldn't get event" + $scope.tracking_input_data.event.key);
                });
        }
    };

});

app.controller('HomeController', function ($scope, $localStorage) {

});

app.controller('SidebarController', function ($scope, $localStorage, $location) {
    $scope.nav = function (path) {
        $location.path(path);
    }
});

app.controller('SettingsSidebarController', function($scope, $localStorage, $location){
    $scope.nav = function (path) {
        $location.path(path);
    };

    $scope.update_event = function(){
        console.log("update");
    };

    $scope.update_tba = function(){
        console.log("update_tba");
    };
});

app.controller('UserLogoutController', function ($scope, $localStorage, $sessionStorage, $location, AuthenticationService, $http) {
    $http.post('/logout');
    AuthenticationService.ClearCredentials();
    $location.path("/login");
});

app.controller('UserLoginController', function ($scope, $localStorage, $rootScope, $location, AuthenticationService) {
    if (AuthenticationService.isAuthorized(0)) $location.path("/");
    $scope.input = {
        'username': '',
        'password': ''
    };
    AuthenticationService.ClearCredentials();

    $scope.closeAlert = function () {
        $scope.alert = undefined;
    };

    $scope.login = function () {
        $rootScope.data_loading += 1;
        AuthenticationService.Login($scope.input.username, $scope.input.password,
            function (response) {
                $location.path('/');
            },
            function (ignored) {
                $scope.alert = 'Error. Try Again.';
                $rootScope.data_loading = 0;
            });
    }

});

app.controller('UserRegisterController', function ($scope, $rootScope, $location, $http) {
    $scope.input = {
        'first_name': '',
        'last_name': '',
        'username': '',
        'password': ''
    };

    $scope.closeAlert = function () {
        $scope.alert = undefined;
    };

    $scope.register = function () {
        $rootScope.data_loading += 1;
        $http.post('/users/create/', $scope.input)
            .then(function (ignored) {
                    $location.path('/login');
                },
                function (ignored) {
                    $scope.alert = 'Error. Try Again.';
                    $rootScope.data_loading = 0;
                });
    }
});

app.controller('AnalysisHomeController', function ($scope, $sessionStorage, $location) {
    if ($sessionStorage.tracked_event === undefined) $location.path("/");
});

app.controller('AnalysisAveragesController', function ($scope, $sessionStorage, $location) {
    if ($sessionStorage.tracked_event === undefined) $location.path("/");
});

app.controller('AnalysisInsightsController', function ($scope, $sessionStorage, $location) {
    if ($sessionStorage.tracked_event === undefined) $location.path("/");
});

app.controller('AnalysisMatchesController', function ($scope, $sessionStorage, $location) {
    if ($sessionStorage.tracked_event === undefined) $location.path("/");
});

app.controller('AnalysisEntriesController', function ($scope, $sessionStorage, $localStorage, $rootScope, $location, $http, $timeout) {

    if($sessionStorage.tracked_event === undefined) $location.path("/");
    if($localStorage.data === undefined) $localStorage.data = {};
    if($localStorage.data[$location.path()] === undefined) $localStorage.data[$location.path()] = {};

    $scope.headers = $localStorage.userSettings.headers[$location.path()];

    if($localStorage.data[$location.path()][$sessionStorage.tracked_event.key] === undefined) {
        console.log("Getting new entry data for " + $sessionStorage.tracked_event.key);
        $rootScope.data_loading += 1;
        $http.get('/get/raw_entries/' + ($sessionStorage.tracked_event.key || ""))
            .then(function (response) {
                    $scope.data = response.data;
                    $timeout(function(){$localStorage.data[$location.path()][$sessionStorage.tracked_event.key] = $scope.data;}, 0);
                    $rootScope.data_loading -= 1;
                },
                function (ignored) {
                    $rootScope.data_loading -= 1;
                });
    }
    else{
        $scope.data = $localStorage.data[$location.path()][$sessionStorage.tracked_event.key];
    }
});

app.controller('SettingsHomeController', function ($scope, $localStorage, $location, AuthenticationService) {
    if ($sessionStorage.tracked_event === undefined || !AuthenticationService.isAuthorized(2)) $location.path("/");
});

app.controller('SettingsCalculationsController', function ($scope, $localStorage, $location, AuthenticationService) {
    if ($sessionStorage.tracked_event === undefined || !AuthenticationService.isAuthorized(2)) $location.path("/");
    $scope.calculations = [
        {'name': 'a', 'key': 'a', 'formula': 'x*x', 'type': 'float'},
        {'name': 'b', 'key': 'b', 'formula': 'x+y', 'type': 'float'},
        {'name': 'c', 'key': 'c', 'formula': 'x+y*x-y/x/x', 'type': 'float'},
        {'name': 'd', 'key': 'd', 'formula': 'x+2', 'type': 'float'}
    ];
});

app.controller('SetupEventController', function ($scope, $localStorage, $sessionStorage, $location, $http, AuthenticationService) {
    if (!AuthenticationService.isAuthorized(2)) $location.path("/");
    $scope.setup_step = 0;
    $scope.default_data =
        [
            {
                "id": "key",
                "label": "Event Key",
                "default_value": "",
                "type": "text"
            },
            {
                "id": "name",
                "label": "Event Name",
                "default_value": "",
                "type": "text"
            },
            {
                "id": "short_name",
                "label": "Short Name",
                "default_value": "",
                "type": "text"
            }
        ];

    $scope.alert = false;
    $scope.closeAlert = function () {
        $scope.alert = false
    };

    //Step 0 - Ask if we should use TBA
    $scope.setup_with_tba_button = function () {
        $scope.setup_step = 1;
        $scope.searchable_events = [];
        $http.get('/get/search_events').then(function (resp) {
            $scope.searchable_events = resp.data;
        });
    };

    $scope.setup_manually_button = function () {
        $scope.setup_step = 2;
    };

    //Step 1 - (TBA Only) Search for the event.
    $scope.event_search = {'input': ''};
    $scope.setup_tba_event = function () {
        $scope.alert = false;
        var event = $scope.event_search.input;
        $http.post('/setup_tba_event', {'key': event.key})
            .then(function (resp) {
                    if (resp.status === 200) {
                        $scope.update_available_events();
                        $sessionStorage.tracked_event = resp.data;
                        $sessionStorage.tracked_event_okay = true;
                        $location.path('/s');
                    }
                },
                function (resp) {
                    if (resp.status === 409) {
                        $scope.alert = {type: 'danger', msg: event.key + ' has already been setup.'};
                    }
                    else {
                        $scope.alert = {
                            type: 'danger',
                            msg: 'Some kind of error occurred with ' + event.key + '. Try again?'
                        };
                    }
                });
    };

    //Step 2 - Edit the event information
    $scope.input_data = {};
    $scope.submit_manual_data = function () {
        console.log($scope.input_data);
        // $location.path('/s/e');
    };


});


app.controller('SheetsHomeController', function ($scope, $rootScope, $localStorage, $location, $http, AuthenticationService, FileSaver, Blob) {
    if (!AuthenticationService.isAuthorized(2)) $location.path("/");
    $scope.sheets = [];

    $scope.showDownloadDialog = function(sheet){
        $scope.selected_sheet = sheet;
        $scope.start_match_number = 0;
        $scope.end_match_number = 100;

    };

    $scope.downloadSheet = function(){
        $rootScope.data_loading += 1;
        $http.get('/download_sheet/' + $scope.selected_sheet.id + "/" + $scope.start_match_number + "/" + $scope.end_match_number)
            .then(function(resp){
                var data = new Blob([resp.data], { type: 'text/plain;charset=utf-8' });
                FileSaver.saveAs(data, $scope.selected_sheet.name + '.pdf');
                $rootScope.data_loading = 0;
                $scope.cancelDownload();
            },
            function(ignored){
                $rootScope.data_loading = 0;
            });
    };

    $scope.cancelDownload = function(){
        $scope.selected_sheet = undefined;
    };

    $http.get('/get/sheets')
        .then(function (resp) {
            $scope.sheets = resp.data;
        });
});

app.controller('SheetsEditController', function ($scope, $rootScope, $localStorage, $location, $http, AuthenticationService, appPath) {
    if (!AuthenticationService.isAuthorized(2)) $location.path("/");
    $scope.sheet_mode = appPath.mode;
    $scope.expanded = {};

    if(appPath.id != undefined){
        $rootScope.data_loading += 1;
        $http.get('/get/sheet/' + appPath.id)
            .then(function(resp){
                $scope.sheet = resp.data;
                $scope.backup_sheet = angular.copy($scope.sheet);
            },
            function(ignored){
                $location.path('/sheets');
            });
    }
    else{
        $scope.sheet = {
            'name': '',
            'id': undefined,
            'data': []
        };
    }

    $scope.saveSheet = function(){
        if($scope.sheet.name.length < 5){
            return;
        }
        $rootScope.data_loading += 1;
        $http.post('/save/sheet', $scope.sheet)
            .then(function(ignored){
                $rootScope.data_loading = 0;
            },
            function(ignored){
                $rootScope.data_loading = 0;
                console.error('Failed to save sheet.');
            });
    };

    $scope.cancelSheet = function(){
        $location.path('/sheets');
    };

    $scope.revertSheet = function(){
        // $scope.sheet = angular.copy($scope.backup_sheet);
    };

    $scope.saveEditField = function(){
        $scope.sheet.data[$scope.selected_field_index] = $scope.selected_field;
        $scope.cancelEditField();
    };

    $scope.cancelEditField = function(){
        $scope.selected_field = undefined;
    };

    $scope.editField = function(field){
        $scope.selected_field_index = $scope.sheet.data.indexOf(field);
        $scope.selected_field = angular.copy(field);
    };

    $scope.addField = function(type, field){
        var new_field = {
            'type': type
        };
        for(var i in field){
            var option = field[i];
            switch(option.type){
                default:
                case 'text':
                    new_field[option.id] = option.value || "";
                    break;
                case 'number':
                    new_field[option.id] = option.value || 0;
                    break;
                case 'checkbox':
                    new_field[option.id] = option.value || false;
                    break;
            }
        }

        var existing_keys = [];
        $scope.sheet.data.forEach(function(e){ existing_keys.push(e.key || []);});
        var suffix_num = 0;
        if(existing_keys.indexOf(new_field.key) !== -1) new_field.key = new_field.key + "_" + (++suffix_num);
        while(existing_keys.indexOf(new_field.key) !== -1){
            new_field.key = new_field.key.substring(0, new_field.key.length - 1 - (++suffix_num).toString().length) + "_" + suffix_num.toString();
        }
        new_field.name = new_field.key.replace(/_/g, " ").toProperCase(); //Replace all '_' with ' '

        $scope.sheet.data.push(new_field);
    };

    $rootScope.data_loading += 1;
    $http.get("/get/default_fields")
        .then(function(resp){
            $scope.default_fields = resp.data;
            $rootScope.data_loading = 0;
        });

    String.prototype.toProperCase = function () {
        return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    };
});