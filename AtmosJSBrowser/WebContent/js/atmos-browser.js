(function($) {
    $.fn.atmosBrowser = function(options) {
        var settings = {
            uid : window.atmosConfig.uid,
            secret : window.atmosConfig.secret,
            location : '/'
        };

        var constants = {
            TYPE_DIRECTORY : 'directory',
            TYPE_FILE : 'regular'
        };

        return this.each(function() {
            if (options) {
                $.extend(settings, options);
            }

            var atmos = new AtmosRest({'uid' : settings.uid, 'secret' : settings.secret});

            // location bar
            var location = $('<div class="atmosLocation" />');
            var locationField = $('<input type="text" class="atmosLocationField" />');
            var locationButton = $('<div class="atmosLocationButton" />').text('Go');
            location.append(locationField).append(locationButton);
            locationField.keypress(function(event) {
                if (event.which == 13) {
                    event.stopPropagation();
                    event.preventDefault();
                    locationButton.click();
                }
            });

            var fileList = $('<div class="atmosFileList" />');
            var fileListHeader = $('<div class="head"><div class="table"><div class="row"><h1 class="atmosFileName">Name</h1><h1 class="atmosFileSize">Size</h1><h1 class="atmosFileType">Type</h1></div></div></div>');
            var fileListBody = $('<div class="body" />');
            var fileListTable = $('<div class="table" />');
            fileListBody.append(fileListTable);
            fileList.append(fileListHeader).append(fileListBody);

            // prevent default mouse behavior
            fileList.mousedown(function(event) {
                event.stopPropagation();
                event.preventDefault();
            });

            // this adds everything to the page (in the selected element(s))
            var browser = $(this).addClass('atmosBrowser');
            browser.append(location).append(fileList);

            // helper methods (not sure where else to define them)
            var methods = {
                makeDirectory : function(value) {
                    if (value === '') return '/';
                    if (value[value.length - 1] !== '/') value += '/';
                    return value;
                },
                makeExpirationDate : function() {
                    var date = new Date();
                    date.setHours(date.getHours() + 24); // 24 hours in the future
                    return date;
                },
                toggleSelected : function() {
                    $('.selected', fileListTable).toggleClass('selected'); // turn off all selected rows
                    $(this).toggleClass('selected'); // select this row
                },
                openFile : function(path) {
                    window.open(atmos.getShareableUrl(path, methods.makeExpirationDate())); // open file
                },
                openDirectory : function(path) {
                    locationField.val(path); // set location bar to selected subdirectory
                    locationButton.click(); // Go to new location
                },
                parentDirectory : function(path) {
                    if (!path || !path[0] === '/') throw "parentDirectory(path): path must start with a slash";

                    if (path[path.length - 1] === '/') path = path.substr(0, path.length - 1); // remove trailing slash if present

                    var lastSlashIndex = path.lastIndexOf('/');
                    if (lastSlashIndex === 0) return '/';
                    else return path.substr(0, lastSlashIndex);
                }
            };

            // set up scrolling in the body of the file list
            fileListBody.height(browser.height() - location.outerHeight() - fileListHeader.outerHeight());

            locationButton.click(function() {

                var currentLocation = locationField.val();
                if (currentLocation[0] !== '/') {
                    $.error("Path not valid");
                    return;
                }

                fileListTable.html('<p>please wait..</p>');

                atmos.listDirectory(methods.makeDirectory(currentLocation), null, null, function(result) {

                    if (result.success) {

                        if (methods.makeDirectory(currentLocation) === '/') {
                            fileListTable.html('');
                        } else {
                            var parentDir = $('<div class="row"><div class="atmosFileName">..</div><div /><div /></div>').mousedown(methods.toggleSelected);

                            parentDir.dblclick(function(event) {
                                event.stopPropagation();
                                event.preventDefault();
                                methods.openDirectory(methods.parentDirectory(currentLocation));
                            });

                            fileListTable.html(parentDir);
                        }

                        for (var i = 0; i < result.results.length; i++) {
                            var entry = result.results[i];
                            var fileRow = $('<div class="row" />');
                            var fileName = $('<div class="atmosFileName" />').text(entry.name);
                            var fileSize = $('<div class="atmosFileSize" />').text('n/a');
                            var fileType = $('<div class="atmosFileType" />').text(entry.type);
                            fileRow.append(fileName).append(fileSize).append(fileType);
                            fileRow.mousedown(methods.toggleSelected);

                            (function(entry) {
                                fileRow.dblclick(function(event) {
                                    event.stopPropagation();
                                    event.preventDefault();
                                    if (entry.type === constants.TYPE_DIRECTORY) {
                                        methods.openDirectory(entry.path);
                                    } else {
                                        methods.openFile(entry.path);
                                    }
                                });
                            })(entry); // have to introduce new scope for entry var (since it is not final) for the callback

                            fileListTable.append(fileRow);
                        }
                    }
                });
            });

            // load initial location
            if (settings.location) {
                locationField.val(settings.location);
                locationButton.click();
            }
        });
    };
})(jQuery);