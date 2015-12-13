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

        self.histogramRowHeight = 100;
        self.histogramRowWidth = 200;
        self.defaultRowHeight = 30;

        var service = {
            getColumnDefs: getColumnDefs,
            getDefaultGridOptions: getDefaultGridOptions,
            getDetailsColumnDefs: getDetailsColumnDefs,
            getDetailsGridOptions: getDetailsGridOptions,
            getDetailsData: getDetailsData,
            getHeaderData: getHeaderData,
            getHistogramMaxYValueFromTable: getHistogramMaxYValueFromTable,
            getHistogramMaxYValueFromValues: getHistogramMaxYValueFromValues,
            getHistogramValues: getHistogramValues,
            getTableAsCsv: getTableAsCsv,
            getTableAsCsvOfChildren: getTableAsCsvOfChildren,
            getTableData: getTableData,
            getTableDataMaxValue: getTableDataMaxValue
        };

        service.Grouping = self.Grouping;
        service.histogramRowWidth = self.histogramRowWidth;

        return service;

        /**
         * @name getColumnDefs
         * @param header - header for the current config - generated by getHeaderData
         * @param sortFunction - applied to the columns
         * @returns List columns
         */
        function getColumnDefs(header, sortFunction, attribute) {
            var columns = [];

            for (var i = 0; i < header.length; ++i) {
                var column = {
                    field: header[i],
                    width: 100,
                    displayName: header[i]
                };

                if (i > 1) {
                    if (attribute == undefined) {
                        column.cellTemplate = 'neighborTable/neighborTableCell.html';
                        column.sortingAlgorithm = sortFunction;
                    } else {
                        column.width = self.histogramRowWidth;
                        column.cellTemplate = 'neighborTable/neighborTableHistogramCell.directive.html';
                    }
                } else {
                    if (i == 0) {
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
         * @name getDefaultGridOptions
         * @param attribute - either distance or diameter - this will cause the rowHeight to be larger
         * @returns Object of grid options.
         */
        function getDefaultGridOptions(attribute) {

            var rowHeight = self.defaultRowHeight;
            if (attribute != undefined) {
                rowHeight = self.histogramRowHeight;
            }

            var gridOptions = {
                rowHeight: rowHeight,
                multiSelect: false,
                enableGridMenu: true
            };

            return gridOptions;
        }

        /**
         * @name getDetailsColumnDefs
         * @param grouping
         * @param attribute
         * @param sortFunction
         * @returns Array of column defs
         */
        function getDetailsColumnDefs(grouping, attribute, sortFunction) {
            if (grouping == self.Grouping.TARGETLABEL && attribute == undefined) {

                return [{
                    field: 'targetId',
                    displayName: 'target id',
                    enableSorting: false
                }, {
                    field: 'count',
                    displayName: 'count',
                    sortingAlgorithm: utils.SortingAlgorithms.sortColumnAsNumbers
                }, {
                    field: 'childIds',
                    displayName: 'child ids',
                    enableSorting: false
                }];

            }
            else if (grouping == self.Grouping.TARGETLABEL && attribute != undefined) {

                return [{
                    field: 'childId',
                    displayName: 'child id',
                    sortingAlgorithm: utils.SortingAlgorithms.sortColumnAsNumbers
                }, {
                    field: 'targetId',
                    displayName: 'target id',
                    enableSorting: false
                }, {
                    field: 'childValue',
                    displayName: 'child value',
                    cellTemplate: 'neighborTable/neighborTableTruncatedValueCell.html',
                    sortingAlgorithm: utils.SortingAlgorithms.sortColumnAsNumbers
                }];

            }
            else if (grouping == self.Grouping.CHILDTYPE && attribute == undefined) {

                return [{
                    field: 'childId',
                    displayName: 'child id',
                    sortingAlgorithm: utils.SortingAlgorithms.sortColumnAsNumbers
                }, {
                    field: 'targetLabel',
                    displayName: 'target label',
                    enableSorting: false
                }, {
                    field: 'targetId',
                    displayName: 'target id',
                    enableSorting: false
                }];
            }
            else if (grouping == self.Grouping.CHILDTYPE && attribute != undefined) {

                return [{
                    field: 'childId',
                    displayName: 'child id',
                    sortingAlgorithm: utils.SortingAlgorithms.sortColumnAsNumbers
                }, {
                    field: 'targetLabel',
                    displayName: 'target label',
                    enableSorting: false
                }, {
                    field: 'targetId',
                    displayName: 'target id',
                    enableSorting: false
                }, {
                    field: 'childValue',
                    displayName: 'child value',
                    cellTemplate: 'neighborTable/neighborTableTruncatedValueCell.html',
                    sortingAlgorithm: utils.SortingAlgorithms.sortColumnAsNumbers
                }];

            }
            else {
                throw 'getDetailsColumnDefs is fucked!';
            }
        }

        /**
         * @name getDetailsGridOptions
         * @returns Object of grid options with custom row template.
         */
        function getDetailsGridOptions() {
            var gridOptions = {};
            gridOptions.rowTemplate = 'common/rowTemplate.html';
            return gridOptions;
        }

        /**
         * @name getTableDetailsData
         * @param attribute
         * @param grouping
         * @param values
         */
        function getDetailsData(attribute, grouping, values) {

            $log.debug('getDetailsData', grouping, attribute);

            var details = [];

            if (grouping == self.Grouping.TARGETLABEL && attribute == undefined) {

                var uniqueTargets = [];
                var childrenPerTarget = [];
                var numChildrenPerTarget = [];

                values.forEach(function (value) {
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

                uniqueTargets.forEach(function (target, i) {
                    details.push({
                        targetId: target,
                        count: numChildrenPerTarget[i],
                        childIds: childrenPerTarget[i]
                    });
                });

            }
            else if (grouping == self.Grouping.TARGETLABEL && attribute != undefined) {

                values.forEach(function (value) {
                    var targetId = volumeCells.getCellNeighborIdFromChildAndPartner(value.cellIndex, value.childIndex, value.partnerIndex);
                    var childId = volumeCells.getCellChildAt(value.cellIndex, value.childIndex).id;
                    var childValue = value.value;

                    details.push({
                        childId: childId,
                        targetId: targetId,
                        childValue: childValue
                    });
                });

            }
            else if (grouping == self.Grouping.CHILDTYPE && attribute == undefined) {


                values.forEach(function (value) {

                    var targetId = '';
                    var targetLabels = '';
                    if (value.partnerIndex == undefined) {

                        var partner = volumeCells.getCellChildPartnerAt(value.cellIndex, value.childIndex);

                        partner.neighborIds.forEach(function (neighborId, i) {

                            if (i == 0) {
                                targetId += neighborId;
                                targetLabels += volumeCells.getCell(neighborId).label;
                            } else {
                                targetId += ', ' + neighborId;
                                targetLabels += ', ' + volumeCells.getCell(neighborId).label;
                            }


                        });

                        if (targetId == '') {
                            targetId = 'none';
                            targetLabels = 'none';
                        }

                        details.push({
                            childId: volumeCells.getCellChildAt(value.cellIndex, value.childIndex).id,
                            targetId: targetId,
                            targetLabel: targetLabels
                        });
                    }

                });

                return details;

            }
            else if (grouping == self.Grouping.CHILDTYPE && attribute != undefined) {

                values.forEach(function (value) {

                    var targetId = '';
                    var targetLabels = '';

                    if (value.partnerIndex == undefined) {

                        var partner = volumeCells.getCellChildPartnerAt(value.cellIndex, value.childIndex);

                        partner.neighborIds.forEach(function (neighborId, i) {

                            if (i == 0) {
                                targetId += neighborId;
                                targetLabels += volumeCells.getCell(neighborId).label;
                            } else {
                                targetId += ', ' + neighborId;
                                targetLabels += ', ' + volumeCells.getCell(neighborId).label;
                            }


                        });

                        if (targetId == '') {
                            targetId = 'none';
                            targetLabels = 'none';
                        }

                        details.push({
                            childId: volumeCells.getCellChildAt(value.cellIndex, value.childIndex).id,
                            targetId: targetId,
                            targetLabel: targetLabels,
                            childValue: value.value
                        });
                    }

                });

                return details;

            }
            else {
                throw 'getDetailsData is fucked!';
            }

            return details;
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
         * @name getHistogramMaxYValueFromTable
         * @param table
         * @param header
         * @param numBins - number of bins that the xAxisRange will be divided into
         * @param xAxisDomain - [0, maxValue]
         * @param xAxisRange - [0, width]
         * @returns Number - max length of histogram bin
         */
        function getHistogramMaxYValueFromTable(table, header, numBins, xAxisDomain, xAxisRange) {

            var maxYValue = 0;

            table.forEach(function (row) {
                header.forEach(function (column, i) {
                    if (i > 1) {
                        maxYValue = Math.max(getHistogramMaxYValueFromValues(row[column].values, numBins, xAxisDomain, xAxisRange), maxYValue);
                    }
                });
            });

            return maxYValue;
        }

        /**
         * @name getHistogramMaxYValueFromValues
         * @param values - list of CellChildValues
         * @param numBins - number of bins that the xAxisRange will be divided into
         * @param xAxisDomain - [0, maxValue]
         * @param xAxisRange - [0, width]
         * @returns Number - max length of histogram bin
         */
        function getHistogramMaxYValueFromValues(values, numBins, xAxisDomain, xAxisRange) {

            // Create bins.
            var histogram = getHistogramValues(values, numBins, xAxisDomain, xAxisRange);

            var maxYValue = -1;

            // Find max sized bin
            histogram.forEach(function (bin) {
                maxYValue = Math.max(maxYValue, bin.length);
            });

            return maxYValue;

        }

        /**
         * @name getHistogramValues
         * @param values - list of CellChildValues
         * @param numBins - number of bins that the xAxisRange will be divided into
         * @param xAxisDomain - [0, maxValue]
         * @param xAxisRange - [0, width]
         * @returns String csv of the current table (header + data).
         */
        function getHistogramValues(values, numBins, xAxisDomain, xAxisRange) {

            var x = d3.scale.linear()
                .domain(xAxisDomain)
                .range(xAxisRange);

            var justValues = values.map(function (d) {
                return d.value;
            });

            return d3.layout.histogram()
                .range(xAxisDomain)
                .bins(x.ticks(numBins))
                (justValues);
        }

        /**
         * @name getTableAsCsv
         * @returns String csv of the current table (header + data).
         */
        function getTableAsCsv(cellIndexes, childTypes, useTargetLabelGroups, useOnlySelectedTargets, selectedTargets, childrenGrouping, attribute) {
            var csv = '';

            var header = getHeaderData(cellIndexes, childTypes, useTargetLabelGroups, useOnlySelectedTargets, selectedTargets, childrenGrouping);

            header.forEach(function (column, i) {

                // Add id, label
                if (i < 2) {
                    csv += column + ', ';
                } else {
                    if (childrenGrouping == self.Grouping.TARGETLABEL) {
                        // Add child counts grouped by type
                        childTypes.forEach(function (childType, j) {
                            var code = volumeStructures.getChildStructureTypeCode(childType);
                            csv += column + ' (' + code + ')' + ', ';
                        });

                    } else if (childrenGrouping == self.Grouping.CHILDTYPE) {
                        csv += column + ', ';
                    }
                }

            });

            // Chop of last comma and space
            csv = csv.substring(0, csv.length - 2);
            csv += '\n';

            var table = getTableData(cellIndexes, childTypes, useTargetLabelGroups, useOnlySelectedTargets, selectedTargets, childrenGrouping);

            table.forEach(function (row) {

                header.forEach(function (column, i) {

                    if (i != 0) {
                        csv += ', ';
                    }

                    if (i == 0 || i == 1) {
                        csv += row[column];
                    } else {

                        if (childrenGrouping == self.Grouping.TARGETLABEL) {

                            if (childTypes.length == 1) {

                                csv += row[column].values.length;

                            } else {

                                childTypes.forEach(function (childType, j) {
                                    var count = 0;

                                    row[column].values.forEach(function (value) {

                                        var currChildType = volumeCells.getCellChildAt(value.cellIndex, value.childIndex).type;
                                        if (currChildType == childType) {
                                            count++;
                                        }
                                    });

                                    csv += count;

                                    if (j != childTypes.length - 1) {
                                        csv += ', ';
                                    }

                                });
                            }

                        } else if (childrenGrouping == self.Grouping.CHILDTYPE) {

                            csv += row[column].values.length;
                        }
                    }
                });

                csv += '\n';
            });

            return csv;

        }

        function getTableAsCsvOfChildren(cellIndexes, childTypes, useTargetLabelGroups, useOnlySelectedTargets, selectedTargets, grouping) {

            var csv = 'cell id, child id, child type, confidence, distance (px), distance (nm), target id, target label, diameter (px), diameter (nm)\n';

            cellIndexes.forEach(function (cellIndex) {

                var children = volumeCells.getCellChildrenByTypeIndexes(cellIndex, childTypes);

                children.forEach(function (childIndex) {

                    var cellId = volumeCells.getCellAt(cellIndex).id;
                    var child = volumeCells.getCellChildAt(cellIndex, childIndex);

                    var distancePx = volumeHelpers.getChildAttr(cellIndex, childIndex, volumeHelpers.PerChildAttributes.DISTANCE, volumeHelpers.Units.PIXELS);
                    var distanceNm = volumeHelpers.getChildAttr(cellIndex, childIndex, volumeHelpers.PerChildAttributes.DISTANCE, volumeHelpers.Units.NM);
                    var diameterPx = volumeHelpers.getChildAttr(cellIndex, childIndex, volumeHelpers.PerChildAttributes.DIAMETER, volumeHelpers.Units.PIXELS);
                    var diameterNm = volumeHelpers.getChildAttr(cellIndex, childIndex, volumeHelpers.PerChildAttributes.DIAMETER, volumeHelpers.Units.NM);

                    var partner = volumeCells.getCellChildPartnerAt(cellIndex, childIndex);
                    if (partner.neighborIds.length > 0) {
                        partner.neighborIds.forEach(function (neighborId) {
                            if (partner.parentId != -1) {
                                var partnerCell = volumeCells.getCell(neighborId);
                            } else {
                                partnerCell = {id: -1, label: 'undefined'};
                            }
                            csv = csv + cellId + ', ' + child.id + ', ' + child.type + ', ' + child.confidence + ',' + distancePx + ', ' + distanceNm + ', ' + partnerCell.id + ', ' + partnerCell.label + ', ' + diameterPx + ', ' + diameterNm + '\n'
                        });
                    } else {
                        var partnerCell = {id: -1, label: 'undefined'};
                        csv = csv + cellId + ', ' + child.id + ', ' + child.type + ', ' + child.confidence + ',' + distancePx + ', ' + distanceNm + ', ' + partnerCell.id + ', ' + partnerCell.label + ', ' + diameterPx + ', ' + diameterNm + '\n'
                    }

                });

            });
            csv = csv.substring(0, csv.length - 1);
            return csv;
        }

        /**
         * @name $scope.saveCurrentCellChildrenData
         * @desc XXX - untested
         */
        /*
         $scope.saveCurrentCellChildrenData = function (indexes, childTypes) {

         var data = "parent id, child id, child type, child confidence, distance (px), distance (nm), child target id, child target label, max diameter (px), max diameter (nm)\n";

         var numIndexes = indexes.length;
         for (var i = 0; i < numIndexes; ++i) {
         data = data + $scope.saveCellNeighborsAsCsv(volumeCells.getCellAt(indexes[i]).id, childTypes);
         }

         var blob = new Blob([data], {type: "text"});

         saveAs(blob, 'data.csv');
         };
         */
        /**
         * @name getTableData
         * @returns Array of Lists containing values for childrenTable.
         */
        function getTableData(cellIndexes, childTypes, useTargetLabelGroups, useOnlySelectedTargets, selectedTargets, childrenGrouping, maxCount, columnWidth, useBarsInTable, attribute, units) {

            var table = [];

            if (childrenGrouping == self.Grouping.TARGETLABEL) {
                cellIndexes.forEach(function (cellIndex) {

                    var results = volumeHelpers.getAggregateChildAttrGroupedByTarget([cellIndex], childTypes, useTargetLabelGroups, attribute, units, cellIndexes);
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
                            row[childTypeCode].values = volumeHelpers.createCellChildValues(cellIndex, children, attribute, units);
                            row[childTypeCode].width = columnWidth;
                        });
                    } else {
                        var allAvailableChildTypes = volumeCells.getAllAvailableChildTypes();
                        allAvailableChildTypes.forEach(function (childType, i) {
                            var children = volumeCells.getCellChildrenByTypeIndexes(cellIndex, childType);
                            var childTypeCode = volumeStructures.getChildStructureTypeCode(childType);
                            row[childTypeCode] = {};
                            row[childTypeCode].values = volumeHelpers.createCellChildValues(cellIndex, children, attribute, units);
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
        function getTableDataMaxValue(header, table, attribute) {
            var maxValue = 0;

            table.forEach(function (row) {

                header.forEach(function (column, i) {

                    if (i > 1) {
                        if (attribute == undefined) {
                            maxValue = Math.max(maxValue, row[column].values.length);
                        } else {
                            var values = row[column].values;
                            values.forEach(function (value) {
                                maxValue = Math.max(maxValue, value.value);
                            });
                        }
                    }
                });
            });

            return maxValue;
        }

    }

})();

