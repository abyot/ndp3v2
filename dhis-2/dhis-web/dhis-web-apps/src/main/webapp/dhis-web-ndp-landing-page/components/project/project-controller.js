/* Controllers */

/* global ndpFramework, parseFloat */

ndpFramework.controller('ProjectController',
    function($scope,
        $translate,
        $modal,
        $filter,
        NotificationService,
        SelectedMenuService,
        MetaDataFactory,
        OrgUnitFactory,
        ProjectService) {

    $scope.model = {
        metaDataCached: false,
        showOnlyCoreProject: false,
        data: null,
        reportReady: false,
        dataExists: false,
        dataHeaders: [],
        optionSetsById: [],
        programsById: [],
        dataElementsById: [],
        attributesById: [],
        optionSets: [],
        objectives: [],
        dataElementGroup: [],
        selectedDataElementGroupSets: [],
        dataElementGroups: [],
        selectedNdpProgram: null,
        ndpProgrammes: [],
        selectedPeriods: [],
        periods: [],
        periodOffset: 0,
        openFuturePeriods: 10,
        selectedPeriodType: 'FinancialJuly',
        coreProjectAttribute: null,
        bac: null,
        ac: null,
        timePerformance: [],
        costPerformance: []
    };

    $scope.model.horizontalMenus = [
        {id: 'financial_performance', title: 'financial_performance', order: 1, view: 'components/project/financial-performance.html', active: true, class: 'main-horizontal-menu'},
        {id: 'physical_performance', title: 'physical_performance', order: 2, view: 'components/project/physical-performance.html', class: 'main-horizontal-menu'}
    ];

    $scope.model.performanceHeaders = [
        {id: 'KPI', displayName: $translate.instant("kpi"), order: 1},
        {id: 'IND', displayName: $translate.instant('indicator'), order: 2},
        {id: 'INT', displayName: $translate.instant('interpretation'), order: 3},
        {id: 'UNI', displayName: $translate.instant('unit'), order: 4},
        {id: 'BSL', displayName: $translate.instant('baseline'), order: 5}
    ];

    $scope.$watch('model.selectedProgram', function(){
        $scope.resetData();
        if ( $scope.model.selectedMenu && $scope.model.selectedMenu.code ){
            $scope.fetchProgramDetails();
        }
    });

    MetaDataFactory.getAll('optionSets').then(function(optionSets){

        $scope.model.optionSets = optionSets;

        angular.forEach(optionSets, function(optionSet){
            $scope.model.optionSetsById[optionSet.id] = optionSet;
        });

        $scope.model.ndp = $filter('getFirst')($scope.model.optionSets, {code: 'ndp'});

        MetaDataFactory.getAll('programs').then(function(programs){
            angular.forEach(programs, function(pr){                
                angular.forEach(pr.programTrackedEntityAttributes, function(pta){
                    $scope.model.attributesById[pta.trackedEntityAttribute.id] = pta.trackedEntityAttribute;
                });
                $scope.model.programsById[pr.id] = pr;
                angular.forEach(pr.programStages, function(stage){
                    angular.forEach(stage.programStageDataElements, function(prstDe){
                        $scope.model.dataElementsById[prstDe.dataElement.id] = prstDe.dataElement;
                    });
                });
            });
            
            $scope.model.programs = $filter('filter')(programs, {programType: 'WITH_REGISTRATION', programDomain: 'projectTracker'}, true);
            $scope.model.kpiProgram =  $filter('getFirst')(programs, {programType: 'WITH_REGISTRATION', programDomain: 'projectKpi'}, true);

            $scope.model.selectedMenu = SelectedMenuService.getSelectedMenu();

            //Get orgunits for the logged in user
            OrgUnitFactory.getViewTreeRoot().then(function(response) {
                $scope.orgUnits = response.organisationUnits;
                angular.forEach($scope.orgUnits, function(ou){
                    ou.show = true;
                    angular.forEach(ou.children, function(o){
                        o.hasChildren = o.children && o.children.length > 0 ? true : false;
                    });
                });
                $scope.selectedOrgUnit = $scope.orgUnits[0] ? $scope.orgUnits[0] : null;
            });
        });
    });

    $scope.fetchProgramDetails = function(){
        $scope.model.selectedProgramStage = null;
        if( $scope.model.selectedMenu && $scope.model.selectedMenu.code && $scope.model.selectedProgram && $scope.model.selectedProgram.id && $scope.model.selectedProgram.programTrackedEntityAttributes ){

            if ( $scope.model.selectedProgram.programStages && $scope.model.selectedProgram.programStages.length > 1 ){
                NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("invalid_project_stage"));
                return;
            }
            
            $scope.model.selectedProgramStage = $scope.model.selectedProgram.programStages[0];
            $scope.model.projectFetchStarted = true;

            ProjectService.getByProgram($scope.selectedOrgUnit, $scope.model.selectedProgram, $scope.model.optionSetsById, $scope.model.attributesById, $scope.model.dataElementsById ).then(function( data ){
                $scope.model.projects = data;
                $scope.model.projectsFetched = true;
                $scope.model.projectFetchStarted = false;
            });
        }
    };

    $scope.getProjectDetails = function( project ){
        if ( $scope.model.selectedProject && $scope.model.selectedProject.trackedEntityInstance === project.trackedEntityInstance ){
            $scope.model.showProjectDetails = !$scope.model.showProjectDetails;
            $scope.model.selectedProject = null;
        }
        else{
            
            $scope.model.selectedProject = project;
            $scope.model.showProjectDetails = true;
            $scope.model.projectKpi = null;
            if( !project.relationship ){
                NotificationService.showNotifcationDialog($translate.instant("warning"), $translate.instant("missing_project_kpi"));
            }

            if( project && project.relationship ){
                ProjectService.getKpi( project.relationship, $scope.model.optionSetsById, $scope.model.attributesById , $scope.model.dataElementsById ).then(function( data ){
                    $scope.model.projectKpi = data;                    
                });
            }
        }
    };

    $scope.resetData = function(){
        $scope.model.projectsFetched = false;
        $scope.model.projects = [];
    };

    $scope.resetView = function(horizontalMenu, e){
        $scope.model.activeHorizontalMenu = horizontalMenu;
        if(e){
            e.stopPropagation();
            e.preventDefault();
        }
    };


    $scope.showOrgUnitTree = function(){
        var modalInstance = $modal.open({
            templateUrl: 'components/outree/orgunit-tree.html',
            controller: 'OuTreeController',
            resolve: {
                orgUnits: function(){
                    return $scope.orgUnits;
                },
                selectedOrgUnit: function(){
                    return $scope.selectedOrgUnit;
                },
                validOrgUnits: function(){
                    return null;
                }
            }
        });

        modalInstance.result.then(function ( selectedOu ) {
            if( selectedOu && selectedOu.id ){
                $scope.selectedOrgUnit = selectedOu;
                $scope.resetData();
            }
        });
    };

    $scope.exportData = function ( name ) {
        var blob = new Blob([document.getElementById('exportTable').innerHTML], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8"
        });

        var reportName = $scope.model.selectedProgram.displayName + " - project status" + " .xls";
        if( name ){
            reportName = name + ' performance.xls';
        }
        saveAs(blob, reportName);
    };
});