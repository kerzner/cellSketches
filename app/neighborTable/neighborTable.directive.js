(function () {
    'use strict';

    angular.module('app.neighborTableModule')
        .directive('neighborTable', neighborTable);

    neighborTable.$inject = ['$log', 'volumeCells', 'volumeStructures', 'volumeHelpers', 'visUtils', 'visTable', 'neighborTableData'];

    function neighborTable($log, volumeCells, volumeStructures, volumeHelpers, visUtils, visTable, neighborTableData) {

        return {
            link: link,
            restrict: 'E',
            templateUrl: 'neighborTable/neighborTable.directive.html',
            scope: {
                broadcastChange: '&',
                model: '=',
                selectedModeChanged: '&'
            }
        };

        /**
         * @desc - interaction that this sets up.
         * 1. User clicks on cell in overview table
         *      onOverViewCellClicked ->
         *          onHighlightingCleared
         *          populateDetailsTableFromClickedCell
         *          Update scope.model.ui.details.
         *
         * 2. User hovers over details row
         *      onDetailsRowHovered ->
         *          onHighlightCellsWithCommonNeighbors
         *          onHighlightingCleared
         *          Update scope.highlightList
         *          Update row[neighborLabel].highlight - cell directives watch this value
         *
         *  3. User moves mouse away from details row
         *      onDetailsRowHovered ->
         *          onHighlightingCleared
         *
         */
        function link(scope, element, attribute) {

            var self = {};

            $log.debug('neighborBarChart - link');

            //self.svg = visUtils.createSvg(element[0]);
            //self.mainGroup = visUtils.createMainGroup(self.svg);
            scope.$on('cellsChanged', cellsChanged);

            self.numSmallMultiplesPerRow = 6;
            self.smallMultiplePadding = 10;
            self.smallMultipleWidth = (visUtils.getSvgWidth() - (self.numSmallMultiplesPerRow * self.smallMultiplePadding)) / self.numSmallMultiplesPerRow;
            self.smallMultipleHeight = 200;
            self.smallMultipleOffsets = new utils.Point2D(self.smallMultiplePadding + self.smallMultipleWidth, self.smallMultiplePadding + self.smallMultipleHeight);

            addDownloadButton();

            // Data is either attribute or count
            scope.DataModes = [
                {
                    name: 'Count',
                    id: 0
                },
                {
                    name: 'Attribute',
                    id: 1
                }
            ];

            // Count encoding is either bar or text
            scope.CountEncodingModes = [
                {
                    name: 'Bars',
                    id: 0
                },
                {
                    name: 'Text',
                    id: 1
                }
            ];

            // Attributes are either distance or diameter
            scope.AttributeModes = [
                {
                    name: 'Distance',
                    id: volumeHelpers.PerChildAttributes.DISTANCE
                },
                {
                    name: 'Diameter',
                    id: volumeHelpers.PerChildAttributes.DIAMETER

                }
            ];

            scope.model.ui.modes = {};
            scope.model.ui.modes.selectedDataMode = scope.DataModes[1];
            scope.model.ui.modes.selectedCountMode = scope.CountEncodingModes[0];
            scope.model.ui.modes.selectedAttributeMode = scope.AttributeModes[0];
            scope.overviewGridOptions = {};
            scope.broadcastChange();

            /**
             * @name addDownLoadButton
             * @desc adds a download button to the div id #sidebar.
             */
            function addDownloadButton() {
                d3.select('#sidebar')
                    .append('html')
                    .html('<hr>' +
                        '<button>Download</button>')
                    .on('click', downloadClicked);
            }

            function cellsChanged(slot, cells, childType, useTargetLabelGroups, useOnlySelectedTargets, selectedTargets, convertToNm, useRadius) {

                scope.model.ui.useBarsInTable = scope.model.ui.modes.selectedCountMode.name == "Bars";

                var useBarsInTable = scope.model.ui.useBarsInTable;
                $log.debug('neighborBarChart - cells changed');
                $log.debug(' cellIndexes', cells);
                $log.debug(' childType', childType);
                $log.debug(' useTargetLabelGroups', useTargetLabelGroups);
                $log.debug(' useOnlySelectedTargets', useOnlySelectedTargets);
                $log.debug(' selectedTargets', selectedTargets);
                $log.debug(' convertToNm', convertToNm);
                $log.debug(' useRadius', convertToNm);
                $log.debug(' convertToNm', useRadius);
                $log.debug(' useBarsInTable', useBarsInTable);

                // Copy to member variables
                self.cells = cells;
                self.useTargetLabelGroups = useTargetLabelGroups;
                self.useOnlySelectedTargets = !useOnlySelectedTargets; // TODO: This is flipped.
                self.selectedTargets = selectedTargets;

                var selectedAttribute = undefined;
                if (scope.model.ui.modes.selectedDataMode.name == 'Attribute') {
                    selectedAttribute = scope.model.ui.modes.selectedAttributeMode.id;
                }

                var cellIndexes = cells.indexes;

                // Create column defs from targets.
                var childrenGrouping = scope.model.ui.selectedMode.value;
                if (childrenGrouping == neighborTableData.Grouping.CHILDTYPE) {
                    self.childType = undefined;
                } else {
                    self.childType = childType;
                }
                var headerData = neighborTableData.getHeaderData(cellIndexes, self.childType, useTargetLabelGroups, self.useOnlySelectedTargets, selectedTargets, childrenGrouping);

                self.targets = headerData.slice(2);

                var columnWidth = 100;
                var columnDefs = neighborTableData.getColumnDefs(headerData, sortColumn, selectedAttribute);

                // Create overview grid options. Here we want to keep the old grid options - this is because the old
                // grid options have some internal state that needs to be preserved.
                angular.extend(scope.overviewGridOptions, neighborTableData.getDefaultGridOptions(selectedAttribute));

                // Update the columns and data.
                scope.overviewGridOptions.columnDefs = columnDefs;
                scope.overviewGridOptions.data = [];
                scope.highlightList = [];

                // Register API for interaction.
                scope.overviewGridOptions.onRegisterApi = function (gridApi) {
                    scope.gridApi = gridApi;
                    gridApi.cellNav.on.navigate(scope, onOverviewCellClicked);
                };

                // Max count is used by the bars to fill appropriately.
                scope.overviewGridOptions.data = neighborTableData.getTableData(cellIndexes, self.childType, useTargetLabelGroups, self.useOnlySelectedTargets, self.selectedTargets, childrenGrouping, 0, columnWidth, 0, selectedAttribute);
                scope.maxCount = neighborTableData.getTableDataMaxValue(headerData, scope.overviewGridOptions.data, selectedAttribute);

                var numBins = 10;
                scope.histogram = {
                    numBins: numBins,
                    xAxisDomain: [0, scope.maxCount],
                    xAxisRange: [0, neighborTableData.histogramRowWidth]
                };
                var maxYValue = neighborTableData.getHistogramMaxYValueFromTable(scope.overviewGridOptions.data, headerData, numBins, scope.histogram.xAxisDomain, scope.histogram.xAxisRange);
                scope.histogram.yAxisDomain = [0, maxYValue];

                // Done with the overview table. Now create the details table.
                createDetailsTable(scope);
            }

            function createDebuggingElements(cells, useTargetLabelGroups, useOnlySelectedTargets, selectedTargets, childType) {
                d3.select(element[0]).selectAll('div').remove();

                d3.select(element[0]).append('div').html('<h4>cell indexes</h4>');
                d3.select(element[0]).append('div').html(cells.ids);

                d3.select(element[0]).append('div').html('<h4>selected labels</h4>');

                if (!useOnlySelectedTargets) {
                    d3.select(element[0]).append('div').html(selectedTargets);
                } else {
                    d3.select(element[0]).append('div').html('using all targets');
                }

                d3.select(element[0]).append('div').html('<h4>select e d child types</h4>');
                d3.select(element[0]).append('div').html(childType);

                var cellIndexes = cells.indexes;
                var targets = volumeHelpers.getAggregateChildTargetNames(cellIndexes, childType, useTargetLabelGroups);
                d3.select(element[0]).append('div').html('<h4>all targets</h4>');
                d3.select(element[0]).append('div').html(targets);

                cellIndexes.forEach(function (cellIndex) {
                    var results = volumeHelpers.getAggregateChildAttrGroupedByTarget([cellIndex], childType, useTargetLabelGroups, volumeHelpers.PerChildAttributes.CONFIDENCE, null, cellIndexes);
                    d3.select(element[0]).append('div').html('<h4>results</h4>');
                    d3.select(element[0]).append('div')
                        .selectAll('body').data(results.valuesLists[0]).enter().append('p').text(function (d) {
                        return d.cellIndex + ', ' + d.childIndex + ', ' + d.value;
                    });
                });
            }

            function createDetailsTable(scope) {
                // Create the details grid.
                scope.gridOptions = {};
                scope.gridOptions.multiSelect = false;
                scope.gridOptions.columnDefs = [{
                    field: 'id',
                    displayName: 'id',
                    width: 75
                }, {
                    field: 'count',
                    displayName: 'count',
                    width: 75
                }, {
                    field: 'children',
                    displayName: 'children'
                }];

                scope.gridOptions.rowTemplate = 'common/rowTemplate.html';

                scope.mouseOverDetailsRow = onDetailsRowHovered;
            }

            function downloadClicked() {

                var data = [];
                var header = [];

                self.cells.indexes.forEach(function (cellIndex) {

                    var results = volumeHelpers.getPerChildAttrGroupedByTypeAndTarget([cellIndex], self.childType, self.useTargetLabelGroups, volumeHelpers.PerChildAttributes.CONFIDENCE, null, self.cells.indexes);

                    if (header.length == 0) {

                        header.push('id');
                        header.push('label');

                        results.labels.forEach(function (label, i) {
                            var targetIndex = self.targets.indexOf(label);

                            if (targetIndex != -1) {
                                var currColumnHeader = label + ' (' + volumeStructures.getChildStructureTypeCode(results.childTypes[i]) + ')';
                                header[i + 2] = currColumnHeader
                            }
                        });

                    }

                    var rowData = [];

                    var cell = volumeCells.getCellAt(cellIndex);
                    rowData.push(cell.id);
                    rowData.push(cell.label);

                    results.valuesLists.forEach(function (values, i) {
                        var targetsIndex = self.targets.indexOf(results.labels[i]);
                        if (targetsIndex != -1) {
                            rowData[i + 2] = (values.length);
                        }
                    });

                    data.push(rowData);
                });

                var csv = utils.dataToText(header);

                data.forEach(function (row) {
                    csv += utils.dataToText(row);
                });

                scope.saveData(csv);
            }

            function onDetailsRowHovered(column, rowScope, mouseOver) {
                if (mouseOver) {
                    onHighlightCellsWithCommonNeighbors(rowScope.$parent.row.entity.id, scope);
                } else {
                    onHighlightingCleared(scope);
                }
            }

            function onHighlightCellsWithCommonNeighbors(neighborId, scope) {

                onHighlightingCleared(scope);

                var neighborCell = volumeCells.getCell(neighborId);
                var neighborLabel = neighborCell.label;
                for (var i = 0; i < scope.overviewGridOptions.data.length; ++i) {
                    var row = scope.overviewGridOptions.data[i];
                    var cellValues = row[neighborLabel].values;
                    for (var j = 0; j < cellValues.length; ++j) {
                        var value = cellValues[j];
                        var otherNeighbor = volumeCells.getCellNeighborIdFromChildAndPartner(value.cellIndex, value.childIndex, value.partnerIndex);
                        if (otherNeighbor == neighborCell.id) {
                            row[neighborLabel].highlight = true;
                            scope.highlightList.push({row: i, label: neighborLabel});
                        }
                    }
                }
            }

            function onHighlightingCleared(scope) {
                for (var i = 0; i < scope.highlightList.length; ++i) {
                    var cell = scope.highlightList[i];
                    scope.overviewGridOptions.data[cell.row][cell.label].highlight = false;
                }
                scope.highlightList = [];
            }

            function onOverviewCellClicked(newRowCol, oldRowCol) {
                var nameOfColumn = newRowCol.col.colDef.name;
                var values = newRowCol.row.entity[nameOfColumn].values;
                onHighlightingCleared(scope);
                populateDetailsTableFromClickedCell(values);

                scope.model.ui.details.cellId = newRowCol.row.entity['id'];
                scope.model.ui.details.target = nameOfColumn;
            }

            function populateDetailsTableFromClickedCell(valueList) {
                var uniqueTargets = [];
                var childrenPerTarget = [];
                var numChildrenPerTarget = [];

                valueList.forEach(function (value) {
                    var id = volumeCells.getCellNeighborIdFromChildAndPartner(value.cellIndex, value.childIndex, value.partnerIndex);
                    var child = volumeCells.getCellChildAt(value.cellIndex, value.childIndex);
                    var currIndex = uniqueTargets.indexOf(id);
                    if (currIndex == -1) {
                        uniqueTargets.push(id);
                        currIndex = uniqueTargets.length - 1;
                        childrenPerTarget[currIndex] = '';
                        childrenPerTarget[currIndex] += child.id;
                        numChildrenPerTarget[currIndex] = 1;
                    } else {
                        childrenPerTarget[currIndex] += ', ' + child.id;
                        numChildrenPerTarget[currIndex] += 1;
                    }
                });

                scope.gridOptions.data = [];

                uniqueTargets.forEach(function (target, i) {
                    scope.gridOptions.data.push({
                        id: target,
                        count: numChildrenPerTarget[i],
                        children: childrenPerTarget[i]

                    });
                });

                scope.$apply();
            }

            function sortColumn(a, b, rowA, rowB, direction) {
                var aData = a.values.length;
                var bData = b.values.length;
                if (aData < bData) {
                    return -1;
                } else if (aData == bData) {
                    return 0;
                } else {
                    return 1;
                }
            }

        }
    }


})();