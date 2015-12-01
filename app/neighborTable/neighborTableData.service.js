(function () {
    'use strict';

    angular
        .module('app.neighborTableModule')
        .factory('neighborTableData', neighborTableData);

    neighborTableData.$inject = ['$log', 'volumeCells', 'volumeStructures', 'volumeHelpers'];

    function neighborTableData($log, volumeCells, volumeStructures, volumeHelpers) {

        var self = this;

        self.Grouping = {
            TARGETLABEL: 0,
            CHILDTYPE: 1
        };

        var service = {
            getColumnDefs: getColumnDefs,
            getHeaderData: getHeaderData,
            getTableAsCsv: getTableAsCsv,
            getTableData: getTableData,
            getTableDataMaxValue: getTableDataMaxValue
        };

        service.Grouping = self.Grouping;

        return service;

        /**
         * @name getColumnDefs
         * @param header - header for the current config - generated by getHeaderData
         * @param sortFunction - applied to the columns
         * @returns List columns
         */
        function getColumnDefs(header, sortFunction) {
            var columns = [];

            for (var i = 0; i < header.length; ++i) {
                var column = {
                    field: header[i],
                    width: 100,
                    displayName: header[i]
                };

                if (i > 1) {
                    column.cellTemplate = 'neighborTable/neighborTableCell.html';
                    column.sortingAlgorithm = sortFunction;
                } else {
                    if(i==0) {
                        column.enableHiding = false;
                    }
                    column.allowCellFocus = false;
                    column.cellClass = 'overviewGridCell';
                    column.pinnedLeft = true;
                }

                columns.push(column);
            }

            return columns;
        }

        /**
         * @name getHeaderData
         * @returns List of strings to appear in the table of cell children.
         */
        function getHeaderData(cellIndexes, childTypes, useTargetLabelGroups, useOnlySelectedTargets, selectedTargets, childrenGrouping) {

            var header = [];

            header.push('id');
            header.push('label');

            if (childrenGrouping == self.Grouping.TARGETLABEL) {

                var targets = volumeHelpers.getCellChildTargets(cellIndexes, childTypes, useTargetLabelGroups, useOnlySelectedTargets, selectedTargets);

                header = header.concat(targets);

            } else {

                var allChildTypes = volumeCells.getAllAvailableChildTypes();

                allChildTypes.forEach(function (childType) {
                    if (childTypes != undefined && childTypes.indexOf(childType) != -1) {
                        header.push(volumeStructures.getChildStructureTypeCode(childType))
                    } else if (childTypes == undefined) {
                        header.push(volumeStructures.getChildStructureTypeCode(childType))
                    }
                });

            }

            return header;
        }

        /**
         * @name getTableAsCsv
         * @returns String csv of the current table (header + data).
         */
        function getTableAsCsv(cellIndexes, childTypes, useTargetLabelGroups, useOnlySelectedTargets, selectedTargets, childrenGrouping) {
            var csv = '';

            var header = getHeaderData(cellIndexes, childTypes, useTargetLabelGroups, useOnlySelectedTargets, selectedTargets, childrenGrouping);

            header.forEach(function (column, i) {

                csv += column;

                if (i != header.length - 1) {
                    csv += ', ';
                } else {
                    csv += '\n'
                }

            });

            var table = getTableData(cellIndexes, childTypes, useTargetLabelGroups, useOnlySelectedTargets, selectedTargets, childrenGrouping);

            table.forEach(function (row) {

                header.forEach(function (column, i) {

                    if (i != 0) {
                        csv += ', ';
                    }

                    if (i == 0 || i == 1) {
                        csv += row[column];
                    } else {
                        csv += row[column].values.length;
                    }
                });

                csv += '\n';
            });

            return csv;

        }

        /**
         * @name getTableData
         * @returns Array of Lists containing values for childrenTable.
         */
        function getTableData(cellIndexes, childTypes, useTargetLabelGroups, useOnlySelectedTargets, selectedTargets, childrenGrouping, maxCount, columnWidth, useBarsInTable) {

            var table = [];

            if (childrenGrouping == self.Grouping.TARGETLABEL) {
                cellIndexes.forEach(function (cellIndex) {

                    var results = volumeHelpers.getAggregateChildAttrGroupedByTarget([cellIndex], childTypes, useTargetLabelGroups, volumeHelpers.PerChildAttributes.CONFIDENCE, null, cellIndexes);
                    var row = {};
                    var cell = volumeCells.getCellAt(cellIndex);
                    row.id = cell.id;
                    row.label = cell.label;

                    results.valuesLists.forEach(function (values, i) {
                        var currTarget = results.labels[i];

                        if (useOnlySelectedTargets) {
                            if (selectedTargets.indexOf(currTarget) != -1) {
                                row[currTarget] = {
                                    values: values,
                                    width: columnWidth,
                                    highlight: false
                                };
                            }
                        } else {
                            row[currTarget] = {
                                values: values,
                                width: columnWidth,
                                highlight: false
                            };
                        }

                    });
                    table.push(row);
                });

            } else if (childrenGrouping == self.Grouping.CHILDTYPE) {

                cellIndexes.forEach(function (cellIndex) {
                    var row = {};
                    var cell = volumeCells.getCellAt(cellIndex);
                    row['id'] = cell.id;
                    row['label'] = cell.label;

                    if (childTypes) {
                        childTypes.forEach(function (childType, i) {
                            var children = volumeCells.getCellChildrenByTypeIndexes(cellIndex, childType);
                            var childTypeCode = volumeStructures.getChildStructureTypeCode(childType);
                            row[childTypeCode] = {};
                            row[childTypeCode].values = volumeHelpers.createCellChildValues(cellIndex, children);
                            row[childTypeCode].width = columnWidth;
                        });
                    } else {
                        var allAvailableChildTypes = volumeCells.getAllAvailableChildTypes();
                        allAvailableChildTypes.forEach(function (childType, i) {
                            var children = volumeCells.getCellChildrenByTypeIndexes(cellIndex, childType);
                            var childTypeCode = volumeStructures.getChildStructureTypeCode(childType);
                            row[childTypeCode] = {};
                            row[childTypeCode].values = volumeHelpers.createCellChildValues(cellIndex, children);
                            row[childTypeCode].width = columnWidth;
                        });
                    }

                    table.push(row)
                });
            }

            return table;
        }

        /**
         * @name getTableDataMaxValue
         * @returns maxValue in the table - ignore the two most left columns.
         */
        function getTableDataMaxValue(header, table) {
            var maxValue = 0;
            table.forEach(function (row) {

                header.forEach(function (column, i) {

                    if (i > 1) {
                        maxValue = Math.max(maxValue, row[column].values.length);
                    }
                });
            });
            $log.error(maxValue);
            return maxValue;
        }

    }

})();

