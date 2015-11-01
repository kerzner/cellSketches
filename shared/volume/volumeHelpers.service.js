(function () {
    'use strict';

    angular
        .module('app.volumeModule')
        .factory('volumeHelpers', volumeHelpers);

    volumeHelpers.$inject = ['volumeCells', 'volumeStructures'];

    function volumeHelpers(volumeCells, volumeStructures) {

        var self = this;
        self.currentUnits = 'nm';
        self.useTargetLabelGroups = true;

        var service = {
            getPerChildTargetNames: getPerChildTargetNames,
            getPerChildAttrGroupedByTarget: getPerChildAttrGroupedByTarget,
            getCurrentUnits: getCurrentUnits,
            isUnitConversionNeeded: isUnitConversionNeeded,
            isUsingTargetLabelGroups: isUsingTargetLabelGroups,
            setCurrentUnits: setCurrentUnits,
            setUseTargetLabelGroups: setUseTargetLabelGroups
        };

        return service;

        /**
         * @name getCurrentUnits
         * @returns String equal to either 'nm' or 'px'
         */
        function getCurrentUnits() {
            return self.currentUnits;
        }

        function getPerChildTargetNames(cellIndexes, childType) {

            var i, j;
            var targets = [];
            var cellIndex, cellPartners, label, group;

            if (!self.useTargetLabelGroups) {

                // If not using target label groups then return a list of all labels adjacent to cellIndexes.

                for (i = 0; i < cellIndexes.length; ++i) {

                    cellIndex = cellIndexes[i];
                    cellPartners = volumeCells.getCellNeighborLabelsByChildType(cellIndex, childType);

                    for (j = 0; j < cellPartners.length; ++j) {

                        label = cellPartners[j].label;
                        if (targets.indexOf(label) == -1) {
                            targets.push(label);
                        }

                    }

                }

            } else {

                // Using target labels. Return a list of all label groups adjacent to cellIndexes.

                var targetIndexes = [];

                for (i = 0; i < cellIndexes.length; ++i) {

                    cellIndex = cellIndexes[i];
                    cellPartners = volumeCells.getCellNeighborLabelsByChildType(cellIndex, childType);

                    for (j = 0; j < cellPartners.length; ++j) {

                        label = cellPartners[j].label;
                        group = volumeStructures.getGroupOfLabel(label);

                        if (targetIndexes.indexOf(group) == -1) {
                            targetIndexes.push(group);
                        }

                    }

                }

                // Convert indexes back into names.
                targetIndexes.forEach(function(e, i) {
                    targets.push(volumeStructures.getGroupAt(e));
                });

                // Add the self and in-class labels.
                targets.push(volumeStructures.getGroupNameInClass());
                targets.push(volumeStructures.getGroupNameSelf());
            }

            return targets;
        }

        function getPerChildAttrGroupedByTarget(cells, childType) {

        }

        /**
         * @name isUnitConversionNeeded
         * @returns Boolean of whether the data reported back will be converted from px to nm.
         */
        function isUnitConversionNeeded() {
            return self.currentUnits == 'nm';
        }

        function isUsingTargetLabelGroups() {
            return self.useTargetLabelGroups;
        }

        /**
         * @name setCurrentUnits
         * @param units - string equal to 'px' or 'nm.' All other values will cause exception.
         */
        function setCurrentUnits(units) {
            if (units == 'px' || units == 'nm') {
                self.currentUnits = units;
            } else {
                throw 'Error - tried to set units to invalid value!';
            }
        }

        function setUseTargetLabelGroups(useTargetLabelGroups) {
            self.useTargetLabelGroups = useTargetLabelGroups;
        }
    }

}());