/* global angular, moment, dhis2, parseFloat, indexedDB */

'use strict';

/* Services */

var ndpFrameworkServices = angular.module('ndpFrameworkServices', ['ngResource'])

.factory('DDStorageService', function(){
    var store = new dhis2.storage.Store({
        name: "dhis2ndp",
        adapters: [dhis2.storage.IndexedDBAdapter, dhis2.storage.DomSessionStorageAdapter, dhis2.storage.InMemoryAdapter],
        objectStores: ['dataElements', 'dataElementGroups', 'dataElementGroupSets', 'dataSets', 'optionSets', 'categoryCombos', 'attributes', 'ouLevels', 'programs', 'legendSets', 'categoryOptionGroupSets', 'optionGroups']
    });
    return{
        currentStore: store
    };
})

/* Context menu for grid*/
.service('SelectedMenuService', function () {
    this.selectedMenu = null;

    this.setSelectedMenu = function (selectedMenu) {
        this.selectedMenu = selectedMenu;
    };

    this.getSelectedMenu= function () {
        return this.selectedMenu;
    };
})

.service('DashboardItemService', function () {
    this.dashboardItems = null;

    this.setDashboardItems = function (dashboardItems) {
        this.dashboardItems = dashboardItems;
    };

    this.getDashboardItems= function () {
        return this.dashboardItems;
    };
})

.service('NDPMenuService', function($http, CommonUtils){
    return {
        getMenu: function(){
            var menuFile = 'data/ndpMenu.json';
            //var menuFile = 'data/ndpMenuSimplified.json';
            var promise = $http.get( menuFile ).then(function(response){
                return response.data;
            }, function(response){
                CommonUtils.errorNotifier(response);
                return response.data;
            });
            return promise;
        }
    };
})

.service('PeriodService', function(CalendarService, DateUtils, orderByFilter){

    this.getPeriods = function(periodType, periodOffset, futurePeriods){
        if(!periodType){
            return [];
        }

        var calendarSetting = CalendarService.getSetting();

        dhis2.period.format = calendarSetting.keyDateFormat;

        dhis2.period.calendar = $.calendars.instance( calendarSetting.keyCalendar );

        dhis2.period.generator = new dhis2.period.PeriodGenerator( dhis2.period.calendar, dhis2.period.format );

        dhis2.period.picker = new dhis2.period.DatePicker( dhis2.period.calendar, dhis2.period.format );

        var d2Periods = dhis2.period.generator.generateReversedPeriods( periodType, periodOffset );

        d2Periods = dhis2.period.generator.filterOpenPeriods( periodType, d2Periods, futurePeriods, null, null );

        angular.forEach(d2Periods, function(p){
            p.startDate = p._startDate._year + '-' + p._startDate._month + '-' + p._startDate._day;
            p.endDate = p._endDate._year + '-' + p._endDate._month + '-' + p._endDate._day;
            p.displayName = p.name;
            p.id = p.iso;
        });

        return d2Periods;
    };

    this.getPreviousPeriod = function( periodId, allPeriods ){
        var index = -1, previousPeriod = null;
        if ( periodId && allPeriods && allPeriods.length > 0 ){
            allPeriods = orderByFilter( allPeriods, '-id').reverse();
            for( var i=0; i<allPeriods.length; i++){
                if( allPeriods[i].id === periodId ){
                    index = i;
                }
            }
            if( index > 0 ){
                previousPeriod = allPeriods[index - 1];
            }
        }
        return {location: index, period: previousPeriod};
    };

    this.getForDates = function(periodType, startDate, endDate){
        if(!periodType){
            return [];
        }

        var calendarSetting = CalendarService.getSetting();

        dhis2.period.format = calendarSetting.keyDateFormat;

        dhis2.period.calendar = $.calendars.instance( calendarSetting.keyCalendar );

        dhis2.period.generator = new dhis2.period.PeriodGenerator( dhis2.period.calendar, dhis2.period.format );

        dhis2.period.picker = new dhis2.period.DatePicker( dhis2.period.calendar, dhis2.period.format );

        var d2Periods = dhis2.period.generator.generateReversedPeriods( periodType, -5 );

        d2Periods = dhis2.period.generator.filterOpenPeriods( periodType, d2Periods, 5, null, null );

        angular.forEach(d2Periods, function(p){
            p.displayName = p.name;
            p.id = p.iso;
        });

        return d2Periods;
    };

    this.getQuarters = function( pe ){
        if ( !pe || !pe._startDate || !pe._startDate._year || !pe._endDate || !pe._endDate._year ){
            return [];
        }
        return [
            {
                id: pe._startDate._year+'Q3',
                iso: pe._startDate._year+'Q3',
                name: 'Q1',
                sortName: 'firstQuarter'
            },{
                id: pe._startDate._year+'Q4',
                iso: pe._startDate._year+'Q4',
                name: 'Q2',
                sortName: 'secondQuarter'
            },{
                id: pe._endDate._year+'Q1',
                iso: pe._endDate._year+'Q1',
                name: 'Q3',
                sortName: 'thirdQuarter'
            },{
                id: pe._endDate._year+'Q2',
                iso: pe._endDate._year+'Q2',
                name: 'Q4',
                sortName: 'fourthQuarter'
        }];
    };
})

/* Factory to fetch optionSets */
.factory('OptionSetService', function($q, $rootScope, DDStorageService) {
    return {
        getAll: function(){

            var def = $q.defer();

            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll('optionSets').done(function(optionSets){
                    $rootScope.$apply(function(){
                        def.resolve(optionSets);
                    });
                });
            });

            return def.promise;
        },
        get: function(uid){
            var def = $q.defer();

            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.get('optionSets', uid).done(function(optionSet){
                    $rootScope.$apply(function(){
                        def.resolve(optionSet);
                    });
                });
            });
            return def.promise;
        },
        getCode: function(options, key){
            if(options){
                for(var i=0; i<options.length; i++){
                    if( key === options[i].displayName){
                        return options[i].code;
                    }
                }
            }
            return key;
        },
        getName: function(options, key){
            if(options){
                for(var i=0; i<options.length; i++){
                    if( key === options[i].code){
                        return options[i].displayName;
                    }
                }
            }
            return key;
        }
    };
})

/* Service to fetch option combos */
.factory('OptionComboService', function($q, $rootScope, DDStorageService) {
    return {
        getAll: function(){
            var def = $q.defer();
            var optionCombos = [];
            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll('categoryCombos').done(function(categoryCombos){
                    angular.forEach(categoryCombos, function(cc){
                        optionCombos = optionCombos.concat( cc.categoryOptionCombos );
                    });
                    $rootScope.$apply(function(){
                        def.resolve(optionCombos);
                    });
                });
            });

            return def.promise;
        },
        getMappedOptionCombos: function(){
            var def = $q.defer();
            var optionCombos = [];
            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll('categoryCombos').done(function(categoryCombos){
                    angular.forEach(categoryCombos, function(cc){
                        angular.forEach(cc.categoryOptionCombos, function(oco){
                            oco.categories = [];
                            angular.forEach(cc.categories, function(c){
                                oco.categories.push({id: c.id, displayName: c.displayName});
                            });
                            optionCombos[oco.id] = oco;
                        });
                    });
                    $rootScope.$apply(function(){
                        def.resolve(optionCombos);
                    });
                });
            });
            return def.promise;
        },
        getBtaDimensions: function(){
            var def = $q.defer();
            var dimension = {options: [], category: null};
            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll('categoryCombos').done(function(categoryCombos){
                    var catFound = false;
                     for( var i=0; i<categoryCombos.length && !catFound; i++){
                        for( var j=0; j<categoryCombos[i].categories.length;j++){
                            if( categoryCombos[i].categories[j].btaDimension ){
                                catFound = true;
                                dimension.category = categoryCombos[i].categories[j].id;
                                dimension.options = categoryCombos[i].categories[j].categoryOptions;
                                dimension.categoryCombo = categoryCombos[i];
                                break;
                            }
                        }
                    }
                    
                    var actualDimension = null;
                    var targetDimension = null;
                    var baselineDimension = null;
                    angular.forEach(dimension.options, function(op){
                        if ( op.dimensionType === 'actual' ){
                            actualDimension = op;
                        }
                        if ( op.dimensionType === 'target' ){
                            targetDimension = op;
                        }
                        if ( op.dimensionType === 'baseline' ){
                            baselineDimension = op;
                        }
                    });
                    
                    $rootScope.$apply(function(){
                        def.resolve({bta: dimension, actual: actualDimension, target: targetDimension, baseline: baselineDimension});
                    });
                });
            });
            return def.promise;
        },
        getBtaAndBsrDimensions: function(){
            
            var def = $q.defer();

            this.getBtaDimensions().then(function( bta ){
              
                var dimension = {options: [], category: null};
                DDStorageService.currentStore.open().done(function(){
                    DDStorageService.currentStore.getAll('categoryCombos').done(function(categoryCombos){
                        var catFound = false;
                        for( var i=0; i<categoryCombos.length && !catFound; i++){
                           for( var j=0; j<categoryCombos[i].categories.length;j++){
                               if( categoryCombos[i].categories[j].bsrDimension ){
                                   catFound = true;
                                   dimension.category = categoryCombos[i].categories[j].id;
                                   dimension.options = categoryCombos[i].categories[j].categoryOptions;
                                   dimension.categoryCombo = categoryCombos[i];
                                   break;
                               }
                           }
                       }

                       var budgetDimension = null;
                       var releaseDimension = null;
                       var spentDimension = null;
                       angular.forEach(dimension.options, function(op){
                           if ( op.dimensionType === 'budget' ){
                               budgetDimension = op;
                           }
                           if ( op.dimensionType === 'release' ){
                               releaseDimension = op;
                           }
                           if ( op.dimensionType === 'spent' ){
                               spentDimension = op;
                           }
                       });

                       var res = {
                           bsr: dimension,
                           budget: budgetDimension,
                           release: releaseDimension,
                           spent: spentDimension
                       };
                       
                       
                       $rootScope.$apply(function(){
                           def.resolve( angular.extend( res, bta ) );
                       });
                    });
                });                                
            });
            
            return def.promise;
            
        },
        getLlgFinanceDimensions: function(uid, sectors){
            var def = $q.defer();
            var dimension = {sectors: [], workPlans: [], programmes: [], outputs: [], fundTypes: [], optionCombos: [], programmeInfo: {}, workPlanInfo: {}};
            angular.forEach(sectors, function(cogs){
                angular.forEach(cogs.categoryOptionGroups, function(cog){
                    dimension.workPlans.push( cog );
                    dimension.workPlanInfo[cog.displayName] = {
                        sector: cogs,
                        programme: $.map(cog.categoryOptions, function(cog){return cog;})
                    };
                    angular.forEach(cog.categoryOptions, function(co){
                        dimension.programmeInfo[co.displayName] = {
                            sector: cogs,
                            workPlan: cog,
                            programme: co
                        };
                    });
                });
            });

            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.get('categoryCombos', uid).done(function(categoryCombo){
                    if ( categoryCombo && categoryCombo.categories && categoryCombo.categories.length > 0 ){
                        for( var j=0; j<categoryCombo.categories.length;j++){
                            if( categoryCombo.categories[j].code === 'LLG_FIN_FT' ){
                                dimension.fundTypes = categoryCombo.categories[j].categoryOptions;
                            }
                            else if( categoryCombo.categories[j].code === 'LLG_FIN_OU' ){
                                dimension.outputs = categoryCombo.categories[j].categoryOptions;
                            }
                            else if( categoryCombo.categories[j].code === 'LLG_FIN_PR' ){
                                dimension.programmes = categoryCombo.categories[j].categoryOptions;
                            }
                        }
                        angular.forEach(categoryCombo.categoryOptionCombos, function(oco){
                            oco.categories = [];
                            angular.forEach(categoryCombo.categories, function(c){
                                oco.categories.push({id: c.id, displayName: c.displayName, categoryCode: c.code});
                            });
                            dimension.optionCombos[oco.id] = oco;
                        });
                    }
                    $rootScope.$apply(function(){
                        def.resolve(dimension);
                    });
                });
            });
            return def.promise;
        },
        hasTargetDimension: function( categoryCombo ){
            if ( !categoryCombo || categoryCombo.isDefault || !categoryCombo.categoryOptionCombos ){
                return false;
            }

            for(var i=0; i<categoryCombo.categoryOptionCombos.length; i++){
                if(categoryCombo.categoryOptionCombos[i].btaDimensionType === 'target'){
                    return true;
                }
            }
            return false;
        }
    };
})

/* Factory to fetch programs */
.factory('DataSetFactory', function($q, $rootScope, storage, DDStorageService, orderByFilter, CommonUtils) {

    return {
        getActionDataSets: function( ou ){
            var systemSetting = storage.get('SYSTEM_SETTING');
            var allowMultiOrgUnitEntry = systemSetting && systemSetting.multiOrganisationUnitForms ? systemSetting.multiOrganisationUnitForms : false;

            var def = $q.defer();

            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll('dataSets').done(function(dss){
                    var multiDs = angular.copy(dss);
                    var dataSets = [];
                    var pushedDss = [];
                    var key = 'dataSetType';
                    angular.forEach(dss, function(ds){
                        ds[key] = ds[key] ? ds[key] : key;
                        ds[key] = ds[key].toLocaleLowerCase();
                        if( ds.id && CommonUtils.userHasWriteAccess('ACCESSIBLE_DATASETS', 'dataSets', ds.id) && ds.organisationUnits.hasOwnProperty( ou.id ) && ds[key] === "action" ){
                            ds.entryMode = 'single';
                            dataSets.push(ds);
                        }
                    });

                    if( allowMultiOrgUnitEntry && ou.c && ou.c.length > 0 ){

                        angular.forEach(multiDs, function(ds){
                            ds[key] = ds[key] ? ds[key] : key;
                            ds[key] = ds[key].toLocaleLowerCase();
                            if( ds.id && CommonUtils.userHasWriteAccess('ACCESSIBLE_DATASETS', 'dataSets', ds.id) ){
                                angular.forEach(ou.c, function(c){
                                    if( ds.organisationUnits.hasOwnProperty( c ) && pushedDss.indexOf( ds.id ) === -1 && ds[key] === "action" ){
                                        ds.entryMode = 'multiple';
                                        dataSets.push(ds);
                                        pushedDss.push( ds.id );
                                    }
                                });
                            }
                        });
                    }
                    $rootScope.$apply(function(){
                        def.resolve(dataSets);
                    });
                });
            });
            return def.promise;
        },
        getTargetDataSets: function(){
            var def = $q.defer();

            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll('dataSets').done(function(dss){
                    var dataSets = [];
                    angular.forEach(dss, function(ds){
                        if( ds.id && CommonUtils.userHasWriteAccess('ACCESSIBLE_DATASETS', 'dataSets', ds.id) && ds.dataSetType && ds.dataSetType === 'targetGroup'){
                            dataSets.push(ds);
                        }
                    });

                    $rootScope.$apply(function(){
                        def.resolve(dataSets);
                    });
                });
            });
            return def.promise;
        },
        getActionAndTargetDataSets: function(){
            var def = $q.defer();

            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll('dataSets').done(function(dss){
                    var dataSets = [];
                    angular.forEach(dss, function(ds){
                        if( ds.id && CommonUtils.userHasWriteAccess('ACCESSIBLE_DATASETS', 'dataSets', ds.id) && ds.dataSetType && ( ds.dataSetType === 'targetGroup' || ds.dataSetType === 'action') ){
                            dataSets.push(ds);
                        }
                    });

                    $rootScope.$apply(function(){
                        def.resolve(dataSets);
                    });
                });
            });
            return def.promise;
        },
        get: function(uid){

            var def = $q.defer();

            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.get('dataSets', uid).done(function(ds){
                    $rootScope.$apply(function(){
                        def.resolve(ds);
                    });
                });
            });
            return def.promise;
        },
        getByOu: function(ou, selectedDataSet, prop, val){
            var def = $q.defer();

            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll('dataSets').done(function(dss){
                    var dataSets = [];
                    angular.forEach(dss, function(ds){
                        if(ds.organisationUnits.indexOf( ou.id ) !== -1 && ds.id && CommonUtils.userHasWriteAccess('ACCESSIBLE_DATASETS', 'dataSets', ds.id)){
                            if ( prop ){
                                if(ds[prop] ){
                                    if( ds[prop] === val )
                                    {
                                        dataSets.push(ds);
                                    }
                                }
                            }
                            else{
                                dataSets.push(ds);
                            }
                        }
                    });

                    dataSets = orderByFilter(dataSets, '-displayName').reverse();

                    if(dataSets.length === 0){
                        selectedDataSet = null;
                    }
                    else if(dataSets.length === 1){
                        selectedDataSet = dataSets[0];
                    }
                    else{
                        if(selectedDataSet){
                            var continueLoop = true;
                            for(var i=0; i<dataSets.length && continueLoop; i++){
                                if(dataSets[i].id === selectedDataSet.id){
                                    selectedDataSet = dataSets[i];
                                    continueLoop = false;
                                }
                            }
                            if(continueLoop){
                                selectedDataSet = null;
                            }
                        }
                    }

                    if(!selectedDataSet || angular.isUndefined(selectedDataSet) && dataSets.legth > 0){
                        selectedDataSet = dataSets[0];
                    }

                    $rootScope.$apply(function(){
                        def.resolve({dataSets: dataSets, selectedDataSet: selectedDataSet});
                    });
                });
            });
            return def.promise;
        }
    };
})

/* factory to fetch and process programValidations */
.factory('MetaDataFactory', function($q, $rootScope, DDStorageService, orderByFilter) {

    return {
        get: function(store, uid){
            var def = $q.defer();
            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.get(store, uid).done(function(obj){
                    $rootScope.$apply(function(){
                        def.resolve(obj);
                    });
                });
            });
            return def.promise;
        },
        set: function(store, obj){
            var def = $q.defer();
            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.set(store, obj).done(function(obj){
                    $rootScope.$apply(function(){
                        def.resolve(obj);
                    });
                });
            });
            return def.promise;
        },
        getAll: function(store){
            var def = $q.defer();
            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll(store).done(function(objs){
                    objs = orderByFilter(objs, ['-code', '-displayName']).reverse();
                    $rootScope.$apply(function(){
                        def.resolve(objs);
                    });
                });
            });
            return def.promise;
        },
        getAllByProperty: function(store, prop, val){
            var def = $q.defer();
            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll(store).done(function(objs){
                    var selectedObjects = [];
                    for(var i=0; i<objs.length; i++){
                        if(objs[i][prop] ){
                            objs[i][prop] = objs[i][prop].toLocaleLowerCase();
                            if( objs[i][prop] === val )
                            {
                                selectedObjects.push( objs[i] );
                            }
                        }
                    }

                    $rootScope.$apply(function(){
                        selectedObjects = orderByFilter(selectedObjects, ['-code', '-displayName']).reverse();
                        def.resolve(selectedObjects);
                    });
                });
            });
            return def.promise;
        },
        getByProperty: function(store, prop, val){
            var def = $q.defer();
            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll(store).done(function(objs){
                    var selectedObject = null;
                    for(var i=0; i<objs.length; i++){
                        if(objs[i][prop] ){
                            objs[i][prop] = objs[i][prop].toLocaleLowerCase();
                            if( objs[i][prop] === val )
                            {
                                selectedObject = objs[i];
                                break;
                            }
                        }
                    }

                    $rootScope.$apply(function(){
                        def.resolve(selectedObject);
                    });
                });
            });
            return def.promise;
        },
        getDataElementGroups: function(){
            var def = $q.defer();
            var dataElementsById = {}, categoryCombosById = {};
            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll('categoryCombos').done(function(categoryCombos){
                    angular.forEach(categoryCombos, function(cc){
                        categoryCombosById[cc.id] = cc;
                    });

                    DDStorageService.currentStore.getAll('dataElements').done(function(dataElements){
                        angular.forEach(dataElements, function(de){
                            var cc = categoryCombosById[de.categoryCombo.id];
                            de.categoryOptionCombos = cc.categoryOptionCombos;
                            dataElementsById[de.id] = de;
                        });

                        DDStorageService.currentStore.getAll('dataElementGroups').done(function(dataElementGroups){
                            angular.forEach(dataElementGroups, function(deg){
                                angular.forEach(deg.dataElements, function(de){
                                    var _de = dataElementsById[de.id];
                                    if ( _de ){
                                        de.categoryOptionCombos = _de.categoryOptionCombos ? _de.categoryOptionCombos : [];
                                        de.displayName = _de.displayName;
                                        de.code = _de.code;
                                    }
                                });

                                deg.dataElements = orderByFilter(deg.dataElements, ['-code', '-displayName']).reverse();
                            });
                            $rootScope.$apply(function(){
                               def.resolve(dataElementGroups);
                            });
                        });
                    });
                });

            });
            return def.promise;
        }
    };
})

.service('ResulstChainService', function($q, $rootScope, $filter, DDStorageService, orderByFilter){

    return {
        getByOptionSet: function( optionSetId ){
            var def = $q.defer();
            DDStorageService.currentStore.open().done(function(){
                DDStorageService.currentStore.getAll('optionGroups').done(function(objs){
                    var optionGroups = $filter('filter')(objs, {optionSet:{id: optionSetId}});
                    if( !optionGroups ){
                        console.log('need to do something here ...');
                    }
                    $rootScope.$apply(function(){
                        var chain = {};
                        angular.forEach(optionGroups, function(og){
                            if ( og.code === 'PR' ){
                                chain.programs = og.options;
                            }
                            if( og.code === 'SP' ){
                                chain.subPrograms = og.options;
                            }
                            if( og.code === 'OJ' ){
                                chain.objectives = og.options;
                            }
                            if( og.code === 'IN' ){
                                chain.interventions = og.options;
                            }
                        });
                        def.resolve(chain);
                    });
                });
            });
            return def.promise;
        }
    };
})

.service('OrgUnitGroupSetService', function($http, CommonUtils){
    return {
        getSectors: function(){
            var filter = '?paging=false&fields=id,displayName,organisationUnitGroups[id,displayName,code,attributeValues[value,attribute[id,code,valueType]],organisationUnits[id,displayName,code,dataSets[dataSetElements[dataElement[dataElementGroups[groupSets[id]]]]]]],attributeValues[value,attribute[id,code,valueType]]';
            var url = dhis2.ndp.apiUrl + '/organisationUnitGroupSets.json' + encodeURI( filter );
            var promise = $http.get( url ).then(function(response){
                var sectors = [];
                if( response && response.data && response.data.organisationUnitGroupSets){
                    var ogss = response.data.organisationUnitGroupSets;
                    angular.forEach(ogss, function(ogs){
                        ogs = dhis2.metadata.processMetaDataAttribute( ogs );
                        if( ogs.orgUnitGroupSetType && ogs.orgUnitGroupSetType === 'sector' && ogs.organisationUnitGroups.length > 0 ){
                            angular.forEach(ogs.organisationUnitGroups, function(og){
                                sectors.push( og );
                            });
                        }
                    });
                }
                return sectors;
            }, function(response){
                CommonUtils.errorNotifier(response);
                return response.data;
            });
            return promise;
        },
        getByGroup: function( group ){
            if ( !group ){
                return CommonUtils.dummyPromise([]);
            }
            var filter = '?paging=false&fields=id,displayName,organisationUnitGroups[id,displayName,code,attributeValues[value,attribute[id,code,valueType]],organisationUnits[id,displayName,code,dataSets[dataSetElements[dataElement[dataElementGroups[groupSets[id]]]]]]],attributeValues[value,attribute[id,code,valueType]]';
            var url = dhis2.ndp.apiUrl + '/organisationUnitGroupSets.json' + encodeURI( filter );
            var promise = $http.get( url ).then(function(response){
                var groups = [];
                if( response && response.data && response.data.organisationUnitGroupSets){
                    var ogss = response.data.organisationUnitGroupSets;
                    angular.forEach(ogss, function(ogs){
                        ogs = dhis2.metadata.processMetaDataAttribute( ogs );
                        if( ogs.orgUnitGroupSetType && ogs.orgUnitGroupSetType === 'mdalg' && ogs.organisationUnitGroups.length > 0 ){
                            angular.forEach(ogs.organisationUnitGroups, function(og){
                                og = dhis2.metadata.processMetaDataAttribute( og );
                                if( og.orgUnitGroupType && og.orgUnitGroupType === group && og.organisationUnits){
                                    angular.forEach(og.organisationUnits, function(ou){
                                        groups.push( ou.id );
                                    });
                                }
                            });
                        }
                    });
                }
                return groups;
            }, function(response){
                CommonUtils.errorNotifier(response);
                return response.data;
            });
            return promise;
        },
        getByGroupOrgUnitOnly: function( group ){
            if ( !group ){
                return CommonUtils.dummyPromise([]);
            }
            var filter = '?paging=false&fields=id,displayName,organisationUnitGroups[id,displayName,code,attributeValues[value,attribute[id,code,valueType]],organisationUnits[id,displayName,code,level,parent[code,displayName]]],attributeValues[value,attribute[id,code,valueType]]';
            var url = dhis2.ndp.apiUrl + '/organisationUnitGroupSets.json' + encodeURI( filter );
            var promise = $http.get( url ).then(function(response){
                var groups = [];
                if( response && response.data && response.data.organisationUnitGroupSets){
                    var ogss = response.data.organisationUnitGroupSets;
                    angular.forEach(ogss, function(ogs){
                        ogs = dhis2.metadata.processMetaDataAttribute( ogs );
                        if( ogs.orgUnitGroupSetType && ogs.orgUnitGroupSetType === 'mdalg' && ogs.organisationUnitGroups.length > 0 ){
                            angular.forEach(ogs.organisationUnitGroups, function(og){
                                og = dhis2.metadata.processMetaDataAttribute( og );
                                if( og.orgUnitGroupType && og.orgUnitGroupType === group && og.organisationUnits){
                                    angular.forEach(og.organisationUnits, function(ou){
                                        groups[ou.id] = ou;
                                    });
                                }
                            });
                        }
                    });
                }
                return groups;
            }, function(response){
                CommonUtils.errorNotifier(response);
                return response.data;
            });
            return promise;
        },
        getByVote: function( id ){
            var filter = '?paging=false&fields=id,displayName,code,dataSets[dataSetElements[dataElement[dataElementGroups[groupSets[id]]]]],attributeValues[value,attribute[id,code,valueType]]';
            var url = dhis2.ndp.apiUrl + '/organisationUnits/' + id + '.json' + encodeURI( filter );
            var promise = $http.get( url ).then(function(response){
                return response.data;
            }, function(response){
                CommonUtils.errorNotifier(response);
                return response.data;
            });
            return promise;
        }
    };
})

.service('Analytics', function($q, $http, $filter, $translate, PeriodService, orderByFilter, CommonUtils, NotificationService){
    return {
        getFinancialData: function( url, metadata ){
            if( url ){
                url = dhis2.ndp.apiUrl + '/dataValueSets.json?' + encodeURI( url );
                var promise = $http.get( url ).then(function(response){
                    var data = [], processed = [];
                    if ( response.data && response.data.dataValues && response.data.dataValues.length > 0 ){
                        angular.forEach(response.data.dataValues, function(dv){
                            var v = {
                                dataElement: dv.dataElement,
                                orgUnit: dv.orgUnit,
                                categoryOptionCombo: dv.categoryOptionCombo,
                                attributeOptionCombo: dv.attributeOptionCombo
                            };

                            var key = dv.dataElement + '_' + dv.orgUnit + '_' + dv.categoryOptionCombo + '_' + dv.attributeOptionCombo;
                            if ( processed.indexOf( key ) === -1 ){
                                processed.push( key );
                                var dataElement = metadata.dataElements[dv.dataElement];
                                var oco = metadata.optionCombos[v.attributeOptionCombo];
                                var lg = metadata.llgInfo[dv.orgUnit];
                                if ( oco && oco.displayName ){
                                    var pr = oco.displayName.split(',');
                                    var prInfo = metadata.programmeInfo[pr[1]];
                                    if ( prInfo ){
                                        var res = $filter('dataFilter')(response.data.dataValues, angular.copy(v));
                                        v.sector = prInfo.sector.displayName;
                                        v.parentLgCode = lg && lg.parent && lg.parent.code ? lg.parent.code : '';
                                        v.parentLgName = lg && lg.parent && lg.parent.displayName ? lg.parent.displayName : '';
                                        v.subCounty = lg && lg.displayName ? lg.displayName : '';
                                        v.workPlan = prInfo.workPlan.displayName;
                                        v.fundType = pr[0];
                                        v.programme = pr[1];
                                        v.output = pr[2];
                                        v.item = dataElement && dataElement.displayName || '';
                                        v.cumFinancialYear = 0;

                                        angular.forEach(metadata.periods, function(p){
                                            v[p.sortName] = '';
                                        });
                                        angular.forEach(res, function(r){
                                            v[metadata.periodsBySortName[r.period].sortName] = r.value;
                                            v.cumFinancialYear = CommonUtils.getSum(v.cumFinancialYear, r.value);
                                        });
                                        data.push(v);
                                    }
                                }
                            }
                        });
                    }
                    return data;
                }, function(response){
                    CommonUtils.errorNotifier(response);
                    return response.data;
                });
                return promise;
            }
            else{
                var def = $q.defer();
                def.resolve();
                return def.promise;
            }

        },
        getData: function( url ){
            if ( url ){
                url = dhis2.ndp.apiUrl + '/analytics?' + encodeURI( url );
                var promise = $http.get( url ).then(function(response){

                    var data = response.data;
                    var reportData = [];
                    if ( data && data.headers && data.headers.length > 0 && data.rows && data.rows.length > 0 ){
                        for(var i=0; i<data.rows.length; i++){
                            var r = {}, d = data.rows[i];
                            for(var j=0; j<data.headers.length; j++){

                                if ( data.headers[j].name === 'numerator' || data.headers[j].name === 'denominator' ){
                                    d[j] = parseInt( d[j] );
                                }
                                else if( data.headers[j].name === 'value' ){
                                    d[j] = parseFloat( d[j] );
                                }

                                r[data.headers[j].name] = d[j];
                            }

                            delete r.multiplier;
                            delete r.factor;
                            delete r.divisor;
                            reportData.push( r );
                        }
                    }
                    return {data: reportData, metaData: data.metaData};
                }, function(response){
                    CommonUtils.errorNotifier(response);
                    return response.data;
                });
                return promise;
            }
            else{
                var def = $q.defer();
                def.resolve();
                return def.promise;
            }
        },
        processData: function( dataParams ){

            var keyDataParams = ['data', 'metaData', 'cost', 'reportPeriods', 'bta', 'selectedDataElementGroupSets', 'dataElementGroups', 'dataElementsById', 'dataElementGroupsById'];

            if( !dataParams ){
                NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("invalid_report_parameters"));
                //return;
            }

            for(var i=0; i<keyDataParams.length; i++){
                if( !dataParams[keyDataParams[i]] && keyDataParams[i] !== 'cost' ){
                    NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("missing_report_parameters") + ' - ' + keyDataParams[i] );
                    //return;
                }
            }

            var btaDimensions = {category: dataParams.bta.category};
            angular.forEach(dataParams.bta.options, function(op){
               btaDimensions[op.id] = op.btaDimensionType;
            });

            var reportPeriods = orderByFilter( dataParams.reportPeriods, '-id').reverse();
            var data = dataParams.data;
            var baseLineTargetActualDimensions = $.map(dataParams.bta.options, function(d){return d.id;});
            var dataExists = false;
            var dataHeaders = [];
            var performanceOverviewHeaders = dataParams.performanceOverviewHeaders;
            var totalRows = 0, dataElementRows = 0;
            var hasPhysicalPerformanceData = false;
            var dataElementRowIndex = {};
            var tableRows = [];
            var povTableRows = [];

            var filterResultData = function(header, dataElement, oc, data ){
                if(!header || !data || !header.periodId || !header.dimensionId || !dataElement) return;

                var filterParams = {
                    dx: dataElement,
                    pe: header.periodId,
                    co: oc
                };

                filterParams[dataParams.bta.category] = header.dimensionId;
                var res = $filter('dataFilter')(data, filterParams)[0];
                return res && res.value ? res.value : '';
            };

            var filterTargetData = function(header, dataElement, oc, data ){
                if(!header || !header.periodId || !dataElement || !oc || !data) return;
                var filterParams = {
                    dx: dataElement,
                    pe: header.periodId,
                    co: oc
                };
                filterParams[dataParams.bta.category] = dataParams.targetDimension.id;

                var res = $filter('dataFilter')(data, filterParams)[0];
                return res && res.value ? res.value : '';
            };
            
            var filterBudgetData = function(header, dataElement, oc, data ){
                if(!header || !data || !header.periodId || !header.dimensionId || !dataElement) return;

                var filterParams = {
                    dx: dataElement,
                    pe: header.periodId,
                    co: oc
                };

                filterParams[dataParams.bsr.category] = header.dimensionId;
                var res = $filter('dataFilter')(data, filterParams)[0];
                return res && res.value ? res.value : '';
            };
            
            var filterBudgetValueData = function(header, dataElement, oc, data ){
                if(!header || !header.periodId || !dataElement || !oc || !data) return;
                var filterParams = {
                    dx: dataElement,
                    pe: header.periodId,
                    co: oc
                };
                filterParams[dataParams.bsr.category] = dataParams.budgetDimension.id;

                var res = $filter('dataFilter')(data, filterParams)[0];
                return res && res.value ? res.value : '';
            };
            
            var valueExists = function(data, header, dataElement, isActionData ){
                if(!header || !data || !header.periodId || !header.dimensionId || !dataElement) {
                    return false;
                }
                var filterParams = {
                    dx: dataElement,
                    pe: header.periodId
                };

                if ( isActionData ){
                    filterParams[dataParams.bsr.category] = header.dimensionId;
                }
                else {
                    filterParams[dataParams.bta.category] = header.dimensionId;
                }

                var res = $filter('dataFilter')(data, filterParams)[0];
                return res && res.value ? true : false;
            };
            
            var extractRange = function( l ){
                var ranges = {
                    red: null,
                    redColor: null,
                    yellowStart: null,
                    yellowEnd: null,
                    yellowColor: null,
                    green: null,
                    greenColor: null,
                    isValid: false
                } ;

                if( l && l.isTrafficLight && l.legends && l.legends.length === 3 ){
                    for(var j=0; j<l.legends.length; j++){
                        if ( l.legends[j].name.toLocaleLowerCase() === 'red'){
                            ranges.red = l.legends[j].startValue;
                            ranges.redColor = l.legends[j].color;
                        }
                        else if( l.legends[j].name.toLocaleLowerCase() === 'yellow' ){
                            ranges.yellowStart = l.legends[j].startValue;
                            ranges.yellowEnd = l.legends[j].endValue;
                            ranges.yellowColor = l.legends[j].color;
                        }
                        else if( l.legends[j].name.toLocaleLowerCase() === 'green' ){
                            ranges.green = l.legends[j].endValue;
                            ranges.greenColor = l.legends[j].color;
                        }
                    }
                    ranges.isValid = true;
                }
                return ranges;
            };

            var getTrafficLight = function( actual, target, deId, aoc ) {
                var style = {};
                var color = "";
                var de = dataParams.dataElementsById[deId];
                var ranges = {};
                if ( de && de.legendSets && de.legendSets.length > 0 ){
                    for( var i=0; i<de.legendSets.length; i++){
                        var l = dataParams.legendSetsById[de.legendSets[i].id];
                        ranges = extractRange( l );
                        if ( ranges.isValid ){
                            break;
                        }
                    }
                }

                if ( !ranges.green || !ranges.yellowStart || !ranges.yellowEnd || !ranges.red ){
                    var l = dataParams.defaultLegendSet;
                    ranges = extractRange( l );
                }

                if ( !ranges.green || !ranges.yellowStart || !ranges.yellowEnd || !ranges.red ){
                    ranges = CommonUtils.getFixedRanges();
                }

                if ( !dhis2.validation.isNumber( actual ) || ! dhis2.validation.isNumber( target ) ){
                    color = '#aaa';
                    style.printStyle = 'grey-background';
                }
                else {
                    hasPhysicalPerformanceData = true;
                    /*var t = CommonUtils.getPercent( Math.abs(actual - target), target, true);
                    if ( t <= ranges.green ){
                        color = ranges.greenColor;
                    }
                    else if( t > ranges.yellowStart && t <= ranges.yellowEnd ){
                        color = ranges.yellowColor;
                    }
                    else if ( t > ranges.red ){
                        color = ranges.redColor;
                    }*/
                    var t = CommonUtils.getPercent( actual, target, true, true);
                    if ( t >= ranges.green ){
                        color = ranges.greenColor;
                        style.printStyle = 'green-background';
                    }
                    else if( t >= ranges.yellowStart && t <= ranges.yellowEnd ){
                        color = ranges.yellowColor;
                        style.printStyle = 'yellow-background';
                    }
                    else {
                        color = ranges.redColor;
                        style.printStyle = 'red-background';
                    }
                }

                style.inlineStyle = {"background-color": color};
                return style;
            };

            angular.forEach(reportPeriods, function(pe){
                var colSpan = 0;
                var d = $filter('filter')(data, {pe: pe.id});
                var targetFilter = {pe: pe.id};
                targetFilter[dataParams.bta.category] = dataParams.targetDimension.id;
                var targetData = $filter('filter')(data, targetFilter);

                pe.hasData = d && d.length > 0;
                pe.hasTargetData = targetData && targetData.length > 0;

                if ( dataParams.displayActionBudgetData ){
                    angular.forEach(dataParams.bsr.options, function(op){
                        colSpan++;
                        dataHeaders.push({
                            name: op.displayName + ' ' + $translate.instant('ugx_billion'),
                            isRowData: true,
                            periodId: pe.id,
                            periodStart: pe.startDate,
                            periodEnd: pe.endDate,
                            dimensionId: op.id,
                            dimension: dataParams.bsr.category});
                    });
                    
                    //budget-release-spent-percentage headers
                    colSpan++;
                    dataHeaders.push({
                        name: $translate.instant('budget_released'),
                        isRowData: false,
                        periodId: pe.id,
                        periodStart: pe.startDate,
                        periodEnd: pe.endDate,
                        denDimensionId: dataParams.budgetDimension.id,
                        numDimensionId: dataParams.releaseDimension.id,
                        dimension: dataParams.bsr.category});
                    
                    colSpan++;
                    dataHeaders.push({
                        name: $translate.instant('budget_spent'),
                        isRowData: false,
                        periodId: pe.id,
                        periodStart: pe.startDate,
                        periodEnd: pe.endDate,
                        denDimensionId: dataParams.budgetDimension.id,
                        numDimensionId: dataParams.spentDimension.id,
                        dimension: dataParams.bsr.category});
                    
                    colSpan++;
                    dataHeaders.push({
                        name: $translate.instant('release_spent'),
                        isRowData: false,
                        periodId: pe.id,
                        periodStart: pe.startDate,
                        periodEnd: pe.endDate,
                        denDimensionId: dataParams.releaseDimension.id,
                        numDimensionId: dataParams.spentDimension.id,
                        dimension: dataParams.bsr.category});
                }
                else{
                    angular.forEach(baseLineTargetActualDimensions, function(dm){
                        var filterParams = {pe: pe.id};
                        filterParams[dataParams.bta.category] = dm;
                        var d = $filter('dataFilter')(data, filterParams);
                        if( d && d.length > 0 ){
                            colSpan++;
                            dataHeaders.push({
                                periodId: pe.id,
                                periodStart: pe.startDate,
                                periodEnd: pe.endDate,
                                dimensionId: dm,
                                dimension: dataParams.bta.category});
                        }
                    });
                }
                if ( pe.hasData) {
                    pe.colSpan = colSpan;
                }
            });

            if( Object.keys( data ).length === 0 ){
                dataExists = false;
            }
            else{
                dataExists = true;            
                var completenessNum = 0, completenessDen = 0;

                angular.forEach(dataParams.selectedDataElementGroupSets, function(degs){
                    degs.expected = {};
                    degs.available = {};

                    var generateCompletenessInfo = function( degs, isActionData ){
                        angular.forEach(degs.dataElementGroups, function(deg){
                            var _deg = $filter('filter')(dataParams.dataElementGroups, {id: deg.id})[0];
                            angular.forEach(_deg.dataElements, function(de){
                                angular.forEach(dataHeaders, function(dh){
                                    var id = [dh.periodId, dh.dimensionId].join('-');
                                    if ( !degs.available[id] ){
                                        degs.available[id] = 0;
                                    }
                                    if ( !degs.expected[id] ){
                                        degs.expected[id] = 0;
                                    }

                                    degs.expected[id]++;
                                    completenessDen++;
                                    if( valueExists(data, dh, de.id, isActionData) ){
                                        degs.available[id]++;
                                        completenessNum++;
                                    }
                                });
                            });
                        });
                    };

                    generateCompletenessInfo( degs, dataParams.displayActionBudgetData );                    
                    
                    angular.forEach(degs.dataElementGroups, function(_deg){
                        var deg = dataParams.dataElementGroupsById[_deg.id];
                        var deCount = 0;
                        var pov = {};
                        var povPercent = {};
                        if ( deg && deg.dataElements && deg.dataElements.length > 0 ){                            
                            angular.forEach(deg.dataElements, function(de){
                                angular.forEach(de.categoryOptionCombos, function(oc){
                                    deCount++;
                                    dataElementRows++;
                                    var tableRow = {
                                        dataElementId: de.id,
                                        dataElement: de.displayName + (oc.displayName === 'default' ? '' : ' - ' + oc.displayName),
                                        dataElementGroup: deg.displayName,
                                        dataElementGroupSet: degs.displayName,
                                        values: {},
                                        styles: {}
                                    };
                                    tableRows.push( tableRow );
                                    
                                    angular.forEach(dataHeaders, function(dh){                                        
                                        if ( dataParams.displayActionBudgetData ){
                                            if ( dh.dimensionId === dataParams.budgetDimension.id )
                                            {
                                                dh.hasBudgetData = true;
                                            }
                                            
                                            if ( dh.isRowData ){
                                                var bVal = filterBudgetData(dh, de.id, oc.id, data);                                            
                                                var trafficLight = "";
                                                if( dh.dimensionId === dataParams.actualDimension.id ){
                                                    var budgetValue = filterBudgetValueData(dh, de.id, oc.id, data);
                                                    trafficLight = getTrafficLight(bVal, budgetValue, de.id, dh.dimensionId);
                                                }                                            
                                                tableRow.styles[dh.dimensionId + '.' + dh.periodId] = trafficLight;
                                                tableRow.values[dh.dimensionId + '.' + dh.periodId] = bVal;
                                            }
                                        }
                                        else {
                                            if ( dh.dimensionId === dataParams.targetDimension.id )
                                            {
                                                dh.hasResultData = true;
                                            }
                                            var val = filterResultData(dh, de.id, oc.id, data);
                                            var trafficLight = "";
                                            if( dh.dimensionId === dataParams.actualDimension.id ){
                                                var targetValue = filterTargetData(dh, de.id, oc.id, data);
                                                trafficLight = getTrafficLight(val, targetValue, de.id, dh.dimensionId);
                                            }
                                            tableRow.styles[dh.dimensionId + '.' + dh.periodId] = trafficLight;
                                            tableRow.values[dh.dimensionId + '.' + dh.periodId] = val;

                                            if ( dh.dimensionId === dataParams.actualDimension.id ){
                                                var ah = angular.copy(dh);
                                                ah.dimensionId = dataParams.actualDimension.id;
                                                var th = angular.copy(dh);
                                                th.dimensionId = dataParams.targetDimension.id;
                                                var av = filterResultData(ah, de.id, oc.id, data);
                                                var tv = filterTargetData(th, de.id, oc.id, data);

                                                if ( !pov[deg.id + '-' + 'A-' + dh.periodId] ){
                                                    pov[deg.id + '-' + 'A-' + dh.periodId] = 0;
                                                }

                                                if ( !pov[deg.id + '-' + 'M-' + dh.periodId] ){
                                                    pov[deg.id + '-' + 'M-' + dh.periodId] = 0;
                                                }

                                                if ( !pov[deg.id + '-' + 'N-' + dh.periodId] ){
                                                    pov[deg.id + '-' + 'N-' + dh.periodId] = 0;
                                                }

                                                if ( !pov[deg.id + '-' + 'X-' + dh.periodId] ){
                                                    pov[deg.id + '-' + 'X-' + dh.periodId] = 0;
                                                }

                                                if ( !av || !tv ){
                                                    pov[deg.id + '-' + 'X-' + dh.periodId] +=1;
                                                }
                                                else{
                                                    var t = CommonUtils.getPercent( av, tv, true, true);
                                                    if (t >= 100){
                                                        pov[deg.id + '-' + 'A-' + dh.periodId] +=1;
                                                    }
                                                    else if ( t>=75 && t<=99 ){
                                                        pov[deg.id + '-' + 'M-' + dh.periodId] +=1;
                                                    }
                                                    else {
                                                        pov[deg.id + '-' + 'N-' + dh.periodId] +=1;
                                                    }
                                                }
                                            }                                            
                                        }
                                    });
                                    dataElementRowIndex[de.id] = dataElementRows;
                                    angular.forEach(performanceOverviewHeaders, function(ph){
                                        var v = pov[deg.id + '-' + ph.id + '-' + ph.period];
                                        var prcnt = CommonUtils.getPercent( v, deg.dataElements.length, true, true);
                                        povPercent[deg.id + '-' + ph.id + '-' + ph.period] = prcnt;
                                    });
                                    
                                });                            
                            });                            
                        }
                        var povTableRow = {
                            dataElementSize: deCount,
                            dataElementGroup: deg.displayName,
                            dataElementGroupId: deg.id,
                            dataElementGroupSet: degs.displayName,
                            pov: pov,
                            povPercent: povPercent
                        };
                        povTableRows.push( povTableRow );
                    });
                });
            }

            return {
                dataExists: dataExists,
                dataHeaders: dataHeaders,
                reportPeriods: reportPeriods,
                totalRows: totalRows,
                hasPhysicalPerformanceData: hasPhysicalPerformanceData,
                completenessNum: completenessNum,
                completenessDen: completenessDen,
                selectedDataElementGroupSets: dataParams.selectedDataElementGroupSets,
                dataElementRowIndex: dataElementRowIndex,
                tableRows: tableRows,
                povTableRows: povTableRows
            };
        }
    };
})

.service('FinancialDataService', function($http, CommonUtils){
    return {
        getLocalData: function( fileName ){
            var promise = $http.get( fileName ).then(function(response){
                return response.data;
            }, function(response){
                CommonUtils.errorNotifier(response);
                return response.data;
            });
            return promise;
        }
    };
})

.service('EventService', function($http, $q, orderByFilter, DHIS2URL, CommonUtils, DateUtils, OptionSetService) {
    return {
        getByOrgUnitAndProgram: function(orgUnit, ouMode, program, optionSets, dataElementsById){
            var url = DHIS2URL + '/events.json?' + 'paging=false&orgUnit=' + orgUnit + '&ouMode='+ ouMode + '&program=' + program;
            var promise = $http.get( url ).then(function(response){
                var events = response.data && response.data.events ? response.data.events : [];
                var faqs = [];
                if( response && response.data && response.data.events ){
                    angular.forEach(events, function(ev){
                        if( ev.dataValues ){
                            var faq = {
                                eventDate: ev.eventDate,
                                event: ev.event
                            };
                            angular.forEach(ev.dataValues, function(dv){
                                var de = dataElementsById[dv.dataElement];
                                var val = dv.value;
                                if ( val && de ){
                                    val = CommonUtils.formatDataValue(null, val, de, optionSets, 'USER');
                                    if ( de.code === 'FAQ' ){
                                        faq.faq = val;
                                    }
                                    if ( de.code === 'FAQ_RESPONSE' ){
                                        faq.faqResponse = val;
                                    }
                                }
                            });
                        }
                        faqs.push( faq );
                    });
                }
                faqs = orderByFilter(faqs, '-eventDate').reverse();
                return faqs;

            }, function(response){
                CommonUtils.errorNotifier(response);
            });

            return promise;
        }
    };
})

.service('DocumentService', function($http, $q, DHIS2URL, CommonUtils, DateUtils, FileService, OptionSetService) {

    var bytesToSize = function ( bytes ){
        var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Byte';
        var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    };

    var processDocuments = function(events ){
        var documents = {};
        if( events && events.length > 0 ){
            angular.forEach(events, function(ev){
                if( ev && ev.dataValues ){
                    var doc = {
                        dateUploaded: DateUtils.formatFromApiToUser(ev.eventDate),
                        uploadedBy: ev.storedBy,
                        event: ev.event
                    };

                    angular.forEach(ev.dataValues, function(dv){
                        if( dv.dataElement && dv.value ){
                            doc.value = dv.value;
                            FileService.get( dv.value ).then(function(res){
                                doc.name = res.displayName || '';
                                doc.size = bytesToSize( res.contentLength || 0 );
                                doc.type = res.contentType || 'undefined';
                                doc.path = '/events/files?dataElementUid=' + dv.dataElement + '&eventUid=' + ev.event;
                            });
                        }
                    });

                    documents[ev.event] = doc;
                }
            });
        }
        return documents;
    };

    var skipPaging = "&skipPaging=true";

    var getByOrgUnitAndProgram = function(orgUnit, ouMode, program, typeDataElement, fileDataElement, optionSets, dataElementById){
        var url = DHIS2URL + '/events.json?' + 'orgUnit=' + orgUnit + '&ouMode='+ ouMode + '&program=' + program + skipPaging;
        var promise = $http.get( url ).then(function(response){
            var events = response.data && response.data.events ? response.data.events : [];
            var documents = [];
            if( response && response.data && response.data.events ){
                angular.forEach(events, function(ev){
                    var doc = {
                        dateUploaded: DateUtils.formatFromApiToUser(ev.eventDate),
                        uploadedBy: ev.storedBy,
                        event: ev.event
                    };

                    if( ev.dataValues ){
                        angular.forEach(ev.dataValues, function(dv){
                            if( dv.dataElement === typeDataElement.id ){
                                doc.folder = dv.value;
                            }
                            else if( dv.dataElement === fileDataElement.id ){
                                doc.value = dv.value;
                                FileService.get( dv.value ).then(function(res){
                                    doc.name = res.displayName || '';
                                    doc.size = bytesToSize( res.contentLength || 0 );
                                    doc.type = res.contentType || 'undefined';
                                    doc.path = '/events/files?dataElementUid=' + dv.dataElement + '&eventUid=' + ev.event;
                                    doc.mda = ev.orgUnitName;
                                });
                            }
                            else{
                                var val = dv.value;
                                var de = dataElementById[dv.dataElement];

                                if( de && de.optionSetValue ){
                                    val = OptionSetService.getName(optionSets[de.optionSet.id].options, String(val));
                                }

                                doc[dv.dataElement] = val;
                            }
                        });
                    }
                    documents.push( doc );
                });
            }
            return documents;

        }, function(response){
            CommonUtils.errorNotifier(response);
        });

        return promise;
    };

    var get = function(eventUid){
        var promise = $http.get(DHIS2URL + '/events/' + eventUid + '.json').then(function(response){
            return response.data;
        });
        return promise;
    };

    var create = function(dhis2Event){
        var promise = $http.post(DHIS2URL + '/events.json', dhis2Event).then(function(response){
            return response.data;
        });
        return promise;
    };

    var deleteEvent = function(dhis2Event){
        var promise = $http.delete(DHIS2URL + '/events/' + dhis2Event.event).then(function(response){
            return response.data;
        });
        return promise;
    };

    var update = function(dhis2Event){
        var promise = $http.put(DHIS2URL + '/events/' + dhis2Event.event, dhis2Event).then(function(response){
            return response.data;
        });
        return promise;
    };

    var getMultiple = function( eventIds ){
        var def = $q.defer();
        var promises = [];
        angular.forEach(eventIds, function(eventId){
            promises.push( get( eventId ) );
        });

        $q.all(promises).then(function( _events ){
            def.resolve( processDocuments(_events) );
        });
        return def.promise;
    };

    return {
        get: get,
        create: create,
        deleteEvent: deleteEvent,
        update: update,
        getMultiple: getMultiple,
        getByOrgUnitAndProgram: getByOrgUnitAndProgram,
        getForMultipleOptionCombos: function( orgUnit, mode, pr, attributeCategoryUrl, optionCombos, startDate, endDate ){
            var def = $q.defer();
            var promises = [], events = [];
            angular.forEach(optionCombos, function(oco){
                promises.push( getByOrgUnitAndProgram( orgUnit, mode, pr, attributeCategoryUrl, oco.id, startDate, endDate) );
            });

            $q.all(promises).then(function( _events ){
                angular.forEach(_events, function(evs){
                    events = events.concat( evs );
                });

                def.resolve(events);
            });
            return def.promise;
        },
        getForMultiplePrograms: function( orgUnit, mode, programs, attributeCategoryUrl, startDate, endDate ){
            var def = $q.defer();
            var promises = [], events = [];
            angular.forEach(programs, function(pr){
                promises.push( getByOrgUnitAndProgram( orgUnit, mode, pr.id, attributeCategoryUrl, null, startDate, endDate) );
            });

            $q.all(promises).then(function( _events ){
                angular.forEach(_events, function(evs){
                    events = events.concat( evs );
                });

                def.resolve(events);
            });
            return def.promise;
        }
    };
})

.service('ProjectService', function($http, orderByFilter, DateUtils, CommonUtils, OptionSetService){
    return {
        getByProgram: function(orgUnit, program, optionSets, attributesById, dataElementsById){
            var url = dhis2.ndp.apiUrl + '/tracker/trackedEntities.json?ouMode=DESCENDANTS&order=created:desc&fields=*&paging=false&orgUnit=' + orgUnit.id + '&program=' + program.id;
            var promise = $http.get( url ).then(function(response){
                var teis = response.data && response.data.instances ? response.data.instances : [];
                var projects = [];
                angular.forEach(teis, function(tei){
                    var startDate = '', endDate = '';
                    if( tei.attributes ){
                        var project = {
                            orgUnit: tei.orgUnit,
                            trackedEntityInstance: tei.trackedEntityInstance,
                            style: {}
                        };
                        angular.forEach(tei.attributes, function(att){
                            var attribute = attributesById[att.attribute];
                            var val = att.value;
                            if( attribute ){
                                val = CommonUtils.formatDataValue(null, val, attribute, optionSets, 'USER');
                                if( attribute.code === 'AT_PL_START_DATE' ){
                                    startDate = val;
                                }
                                if( attribute.code === 'AT_PL_END_DATE' ){
                                    endDate = val;
                                }

                                if( attribute.code === 'AT_PRIORITY' && att.value ){
                                    var style = CommonUtils.getFixedTrafficStyle();
                                    if( att.value === 'High' ){
                                        project.style[att.attribute] = style.red;
                                    }
                                    if( att.value === 'Normal'){
                                        project.style[att.attribute] = style.yellow;
                                    }
                                    if( att.value === 'Low'){
                                        project.style[att.attribute] = style.green;
                                    }
                                }
                            }
                            project[att.attribute] = val;
                        });
                        if( startDate !== '' && endDate !== '' ){
                            var duration = DateUtils.getDifference(startDate,endDate);
                            project.duration = isNaN( duration ) ? '' : Math.floor(duration  / 30 );
                        }
                    }
                    if ( tei.enrollments && tei.enrollments.length === 1 ){
                        project.vote = tei.enrollments[0].orgUnitName;
                        if ( tei.enrollments[0].events ){
                            tei.enrollments[0].events = orderByFilter(tei.enrollments[0].events, '-occurredAt').reverse();
                            var len = tei.enrollments[0].events.length;
                            var ev = tei.enrollments[0].events[len-1];
                            if ( ev && ev.dataValues ){
                                project.status = {};
                                angular.forEach(ev.dataValues, function(dv){
                                    var de = dataElementsById[dv.dataElement];
                                    var val = dv.value;
                                    if( de ){
                                        val = CommonUtils.formatDataValue(null, val, de, optionSets, 'USER');
                                    }
                                    if ( de.code === 'AT_RATING' && val !== '' ){
                                        var style = CommonUtils.getTrafficColorForValue( val );
                                        project.style[dv.dataElement] = {
                                            inlineStyle: style.inlineStyle,
                                            printStyle: style.printStyle
                                        };
                                    }
                                    if ( de.code === 'AT_PROGRESS_STATUS' && val !== '' ){
                                        var style = CommonUtils.getFixedTrafficStyle();
                                        if( dv.value === 'Not started' ){
                                            project.style[dv.dataElement] = style.red;
                                        }
                                        if( dv.value === 'In progress'){
                                            project.style[dv.dataElement] = style.yellow;
                                        }
                                        if( dv.value === ' Completed'){
                                            project.style[dv.dataElement] = style.green;
                                        }
                                        if( dv.value === 'Cancelled'){
                                            project.style[dv.dataElement] = style.grey;
                                        }
                                    }
                                    if ( de.code === 'AT_DELAYED' && val !== '' ){
                                        var style = CommonUtils.getFixedTrafficStyle();
                                        if( dv.value === 'true' ){
                                            project.style[dv.dataElement] = style.red;
                                        }
                                        if( dv.value === 'false'){
                                            project.style[dv.dataElement] = style.green;
                                        }
                                    }
                                    project.status[dv.dataElement] = val;
                                });
                            }
                        }
                    }
                    projects.push( project );
                });

                return projects;
            }, function(response){
                CommonUtils.errorNotifier(response);
            });
            return promise;
        },
        get: function( project, optionSets, attributesById, dataElementsById ){
            var url = dhis2.ndp.apiUrl + '/trackedEntityInstances/' + project.trackedEntityInstance +'.json?fields=*';
            var promise = $http.get( url ).then(function(response){

                var tei = response.data;

                if( tei && tei.attributes ){
                    angular.forEach(tei.attributes, function(att){
                        var attribute = attributesById[att.attribute];
                        var val = att.value;
                        if( attribute ){
                            val = CommonUtils.formatDataValue(null, val, attribute, optionSets, 'USER');
                        }
                        att.value = val;
                    });
                }

                if( tei.enrollments ){
                    angular.forEach(tei.enrollments, function(en){
                        en.enrollmentDate = DateUtils.formatFromApiToUser(en.enrollmentDate);
                        angular.forEach(en.events, function(ev){
                            ev.eventDate = DateUtils.formatFromApiToUser(ev.eventDate);
                            angular.forEach(ev.dataValues, function(dv){
                                var de = dataElementsById[dv.dataElement];
                                var val = dv.value;
                                if ( de ){
                                    val = CommonUtils.formatDataValue(ev, val, de, optionSets, 'USER');
                                }
                                ev[dv.dataElement] = val;
                            });
                        });
                    });
                }

                return tei;
            }, function(response){
                CommonUtils.errorNotifier(response);
            });
            return promise;
        },
        getProjectKpi: function( project, ind ){
            var indVal = 0, numerator = null;
            var indRegex = /[A#]{\w+.?\w*}/g;
            if( ind.expression ) {

                var expression = angular.copy( ind.expression );
                var matcher = expression.match( indRegex );

                for ( var k in matcher )
                {
                    var match = matcher[k];

                    var operand = match.replace( dhis2.metadata.operatorRegex, '' );

                    if ( !numerator ){
                        numerator = operand.substring(1, operand.length);
                    }
                    var value = project[operand.substring(1, operand.length)];

                    expression = expression.replace( match, value );
                }
                indVal = eval( expression );
                indVal = isNaN( indVal ) ? '-' : parseFloat(indVal * 100).toFixed(2) + '%';
            }


            return {value: indVal, numerator: numerator};
        }
    };
})

.service('DataValueService', function($http, CommonUtils) {

    return {
        getDataValueSet: function( params ){
            var promise = $http.get('../api/dataValueSets.json?' + params ).then(function(response){
                return response.data;
            }, function( response ){
                CommonUtils.errorNotifier(response);
                return response.data;
            });
            return promise;
        }
    };
});