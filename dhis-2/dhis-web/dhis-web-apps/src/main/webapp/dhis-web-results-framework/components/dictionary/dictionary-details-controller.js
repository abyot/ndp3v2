/* Controllers */

/* global ndpFramework */

ndpFramework.controller('DictionaryDetailsController',
    function($scope,
            $modalInstance,
            dictionaryItem,
            dictionaryHeaders){

    $scope.dictionaryItem = dictionaryItem;
    $scope.model = {
        dictionaryItem: dictionaryItem,
        dictionaryHeaders: dictionaryHeaders,
        completeness: {
            green: ['displayName', 'code', 'periodType', 'computationMethod', 'indicatorType', 'preferredDataSource', 'rationale', 'responsibilityForIndicator', 'unit'],
            yellow: ['displayName', 'code', 'accountabilityForIndicator', 'computationMethod', 'preferredDataSource', 'unit'],
            invalid: ['isProgrammeDocument', 'isDocumentFolder']
        }
    };

    $scope.close = function () {
        $modalInstance.close($scope.model.dictionaryHeaders);
    };

    $scope.showHideColumns = function(gridColumn){
        if(gridColumn.show){
            $scope.hiddenGridColumns--;
        }
        else{
            $scope.hiddenGridColumns++;
        }
    };
});