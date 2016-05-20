(function (angular) {
  "use strict";
  
  angular.module("echarts-ng").provider("$echarts", EchartsAssistanceProvider);
  
  /**
   * @ngdoc service
   * @name echarts-ng.service:$echartsProvider
   *
   * @description - echarts-ng util service
   */
  function EchartsAssistanceProvider() {
    var ctx = this;
    
    // base echarts options
    ctx.GLOBAL_OPTION = {
      theme: "macarons",
      driftPalette: true,
      title: {
        left: "center",
        top: "top",
        padding: [20, 10, 10, 10]
      },
      grid: {
        top: "15%",
        left: "5%",
        right: "5%",
        bottom: "5%",
        containLabel: true
      },
      backgroundColor: "rgba(255, 255, 255, .5)",
      legend: {
        left: "center",
        top: "top",
        padding: [20, 10, 10, 10]
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow"
        }
      }
    };
    
    // modify base echarts options
    ctx.setGlobalOption = function (option) {
      angular.extend(ctx.GLOBAL_OPTION, option);
    };
    
    /**
     * @ngdoc service
     * @name echarts-ng.service:$echarts
     *
     * @requires $q
     * @requires $timeout
     *
     * @description - echarts-ng util method
     */
    ctx.$get = ["$q", "$timeout", "$waterfall", "$dimension", function ($q, $timeout, $waterfall, $dimension) {
      var assistance = {};

      /*global EchartsDecorativeMap*/

      /**
       * @ngdoc property
       * @name echarts-ng.service:storage
       *
       * @type {object}
       *
       * @description - storage for echarts instance, provide decorative shim avoid unexpected situation
       */
      assistance.storage = new EchartsDecorativeMap();
      assistance.generateInstanceIdentity = generateInstanceIdentity;
      assistance.getEchartsGlobalOption = getEchartsGlobalOption;
      assistance.registerEchartsInstance = registerEchartsInstance;
      assistance.queryEchartsInstance = queryEchartsInstance;
      assistance.removeEchartsInstance = removeEchartsInstance;
      assistance.updateEchartsInstance = updateEchartsInstance;
      assistance.driftPaletteProperty = driftPaletteProperty;
      assistance.driftEchartsPalette = driftEchartsPalette;

      return assistance;

      /**
       * @ngdoc method
       * @methodOf echarts-ng.service:$echarts
       * @name echarts-ng.service:$echarts#getEchartsGlobalOption
       *
       * @description - query the global base echarts option
       */
      function getEchartsGlobalOption() {
        return ctx.GLOBAL_OPTION;
      }

      /**
       * @ngdoc method
       * @methodOf echarts-ng.service:$echarts
       * @name echarts-ng.service:$echarts#generateInstanceIdentity
       *
       * @return {string}
       *
       * @description - generate unique id for different echarts instance
       */
      function generateInstanceIdentity() {
        return Math.random().toString(36).substr(2, 9);
      }

      /**
       * @ngdoc method
       * @methodOf echarts-ng.service:$echarts
       * @name echarts-ng.service:$echarts#registerEchartsInstance
       *
       * @param {string} identity - the identity generated before
       * @param {object} instance - the echarts instance
       *
       * @description - store the specific instance
       */
      function registerEchartsInstance(identity, instance) {
        assistance.storage.set(identity, instance);
      }

      /**
       * @ngdoc method
       * @methodOf echarts-ng.service:$echarts
       * @name echarts-ng.service:$echarts#queryEchartsInstance
       *
       * @param {string} identity - the unique instance id generated by {@link echarts-ng.service:$echarts#generateInstanceIdentity}
       * @return {promise<object>}
       *
       * @description - get the specific echarts instance for event bind or something else
       */
      function queryEchartsInstance(identity) {
        var deferred = $q.defer();

        $timeout(function () {
          if (assistance.storage.has(identity)) {
            deferred.resolve(assistance.storage.get(identity));
          } else {
            console.error("Echarts Identity Not Registered, Please Verify The Process"); //eslint-disable-line no-console
            deferred.reject({errorDesc: "Echarts Identity Not Registered, Please Verify The Process"});
          }
        }, 0);

        return deferred.promise;
      }

      /**
       * @ngdoc method
       * @methodOf echarts-ng.service:$echarts
       * @name echarts-ng.service:$echarts#removeEchartsInstance
       *
       * @param {string} identity - the unique instance id generated by {@link echarts-ng.service:$echarts#generateInstanceIdentity}
       *
       * @description - remove specific instance
       */
      function removeEchartsInstance(identity) {
        assistance.storage.delete(identity);
      }

      /**
       * @ngdoc method
       * @methodOf echarts-ng.service:$echarts
       * @name echarts-ng.service:$echarts#updateEchartsInstance
       *
       * @param {string} identity - the identity generated before
       * @param {object} config - the echarts adaptable option
       *
       * @description - update the instance, switch between loading and draw
       */
      function updateEchartsInstance(identity, config) {
        var instance = assistance.storage.get(identity)
          , decorativeConfig;

        if (angular.isUndefined(instance)) {
          console.warn("The instance not registered. Probably the exception belongs to the directive wrap"); //eslint-disable-line no-console
          return;
        }

        $waterfall.adaptWaterfallTooltip(instance, config);
        $dimension.shouldAdjustEchartsDimension(config.dynamic, config.series) && $dimension.adjustEchartsDimension(instance.getDom(), config.series);
        decorativeConfig = $waterfall.adaptWaterfallSeries(config);

        if (angular.isObject(decorativeConfig) && angular.isArray(decorativeConfig.series) && decorativeConfig.series.length) {
          instance.hideLoading();
          instance.resize();
          instance.setOption(decorativeConfig);
        } else {
          //instance.clear();
          instance.showLoading("default", {maskColor: "rgba(255, 255, 255, 1)"});
        }
      }

      /**
       * @ngdoc method
       * @methodOf echarts-ng.service:$echarts
       * @name echarts-ng.service:$echarts#driftEchartsPalette
       *
       * @param {array} instance - the echarts instance
       * @param {boolean} driftPalette - whether active palette drift
       *
       * @description - drift the palette, improve echarts appearance when multiple similar instance but can't implode
       */
      function driftEchartsPalette(instance, driftPalette) {
        if (!driftPalette) return;

        var option = instance.getOption()
          , originPalette = angular.copy(option.color)
          , palette = driftPaletteProperty(originPalette, assistance.storage.size);

        $timeout(function() {
          instance.setOption({color: palette});
        }, 0);
      }

      /**
       * @ngdoc method
       * @methodOf echarts-ng.service:$echarts
       * @name echarts-ng.service:$echarts#driftPaletteProperty
       *
       * @param {array} palette - the palette which echarts make use of.
       * @param {number} offset - the palette offset
       *
       * @description - implement for drift the palette
       */
      function driftPaletteProperty(palette, offset) {
        palette = angular.copy(palette);
        
        var relative
          , clip
          , length = palette.length;

        relative = offset < length ? offset : offset % length;
        clip = palette.splice(0, relative);

        return palette.concat(clip);
      }
    }];
  }
})(angular);