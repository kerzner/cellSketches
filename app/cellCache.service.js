/**
 * Copyright (c) Ethan Kerzner 2015
 */

myApp.service('cellCache', function (volumeQueries) {

    var self = this;

    self.verbose = true;

    self.cells = [];
    self.cellLocations = [];
    self.cellChildren = [];
    self.structures = [];

    self.oneChildPerQuery = false;
    self.multiChildPerQuery = true;

    // TODO: Figure out something else to do with this.
    self.handleException = function (exception) {
        console.log(exception);
    };

    self.isChildOfCell = function (child, cell) {
        var children = self.cellChildren[cell];
        for (var i = 0; i < children.length; ++i) {
            if (children[i].id == child) {
                return true;
            }
        }
        return false;
    };

    // Load cells of label. Returns a promise of the query status.
    self.loadCells = function (label) {

        return Q.promise(
            function (resolve, reject, notify) {

                var request = "Structures?$filter=(Label eq " + label + ")&$expand=Locations&$" +
                    "select=Locations/Radius,Locations/VolumeX,Locations/VolumeY,Locations/Z,ID,Locations/ID";

                // Shove data into the cellCache. We have a try catch here because otherwise the Q library will hide
                // exceptions from us.
                var parseResults = function (data) {
                    try {
                        // Outstanding queries. These get used only if a cell's structure count exceeds the page size.
                        var promises = [];

                        for (var i = 0; i < data.results.length; ++i) {

                            var cell = {
                                id: data.results[i].ID,
                                locations: self.cellLocations.length
                            };

                            // Self is the cellCache--not the promise.
                            self.cells.push(cell);
                            self.cellLocations.push(data.results[i].Locations.results);

                            var nextUri = data.results[i].Locations.__next;
                            if (nextUri) {
                                promises.push(loadCellStructuresRemaining(nextUri, cell.locations));
                            }
                        }

                        // Only resolve after all queries have finished.
                        Q.all(promises).then(function () {
                            resolve();
                        });

                    } catch (exception) {

                        self.handleException(exception);

                    }
                };

                volumeQueries.readUri(request)
                    .then(parseResults);
            }
        );

    };

    self.loadCellChildren = function () {
        var promises = [];
        for (var i = 0; i < self.cells.length; ++i) {
            promises[i] = loadCellChildren(i);
        }
        return Q.all(promises);
    };

    self.loadCellChildrenTargets = function () {
        for (var i = 0; i < self.cells.length; ++i) {
            loadCellChildrenTargets(i);
        }
    };

    var loadCellStructuresRemaining = function (nextUri, index) {

        return Q.promise(function (resolve, reject, notify) {

            var parseResults = function (data) {

                try {

                    self.cellLocations[index] = self.cellLocations[index].concat(data.results);

                    nextUri = data.__next;
                    if (nextUri) {
                        volumeQueries.readUriComplete(nextUri).then(parseResults);
                    } else {
                        resolve();
                    }

                } catch (exception) {

                    self.handleException(exception);
                }
            };

            volumeQueries.readUriComplete(nextUri).then(parseResults);
        });

    };

    var loadCellChildren = function (index) {

        return Q.promise(
            function (resolve, reject, notify) {

                var promises = [];

                // Shove data into the cellCache. We have a try catch here because otherwise the Q library will hide
                // exceptions from us.
                var parseResults = function (data) {
                    try {
                        // TODO: Implement recursive querying for num children > page size.
                        if (data.results.__next) {
                            console.log("Found cell with num children > page size.");
                            console.log("Cell index:" + index);
                            console.log(data);
                            reject();
                        }

                        for (var i = 0; i < data.results.length; ++i) {

                            var results = data.results[i];

                            var locations = [];

                            for (var j = 0; j < results.Locations.results.length; ++j) {

                                var location = {
                                    volumeX: results.Locations.results[j].VolumeX,
                                    volumeY: results.Locations.results[j].VolumeY,
                                    z: results.Locations.results[j].Z
                                };

                                locations.push(location);
                            }

                            var child = {
                                id: results.ID,
                                typeId: results.TypeID,
                                locations: locations
                            };

                            self.cellChildren[index].push(child);
                        }

                        resolve();

                    } catch (exception) {

                        self.handleException(exception);

                    }
                };

                self.cellChildren[index] = [];

                var id = self.cells[index].id;

                var request = "Structures?$filter=ParentID eq " + id + "&$expand=Locations&$" +
                    "select=Locations/Z,Locations/VolumeX,Locations/VolumeY,TypeID,ID";

                volumeQueries.readUri(request)
                    .then(parseResults);
            }
        );
    };

    var loadCellChildrenTargets = function (index) {
        try {

            var promises = [];
            var children = self.cellChildren[index];
            var request = "StructureLinks?$filter=(";
            var filter = "";

            for (var i = 0; i < children.length; ++i) {

                var child = children[i];

                filter = filter.concat("SourceID eq " + child.id + " or TargetID eq " + child.id + " or ");

                // Larger than 1400 => server problems. Wtf?
                if ((request + filter + ")").length > 1400) {
                    filter = filter.substr(0, filter.length - 3);
                    promises.push(volumeQueries.readUri(request + filter + ")"));
                    if (self.verbose) {
                        console.log(request + filter + ")");
                    }
                    filter = "";
                }
            }

            if (filter.length) {
                filter = filter.substr(0, filter.length - 3);
                promises.push(volumeQueries.readUri(request + filter + ")"));
            }

            var parseResults = function (data) {
                console.log(data);

                var totalLinks = 0;
                var otherChildren = [];
                for (var i = 0; i < data.length; ++i) {
                    var results = data[0].results;
                    for (var j = 0; j < results.length; ++j) {
                        var link = results[j];
                        totalLinks++;
                        if(self.isChildOfCell(link.TargetID, index)) {
                            otherChildren.push(link.SourceID);
                        } else if(self.isChildOfCell(link.SourceID, index)) {
                            otherChildren.push(link.TargetID)
                        } else {
                            console.log("WTF?!?");
                        }
                    }
                }
                console.log(otherChildren.length);
                console.log(totalLinks);

            };

            Q.all(promises).then(parseResults);

        } catch (exception) {
            console.log(exception);
        }
    };
});