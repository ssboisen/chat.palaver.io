angular.module('palaver-ui', [])
    .directive('ngAutoScroll', function() {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {

            var deregistration = scope.$watch(attrs.ngAutoScroll, function ngAutoScrollAction(){
                var jQueryElement = $(element);
                setTimeout(function () {
                var sh = jQueryElement.prop("scrollHeight");
                  jQueryElement.animate({ scrollTop: sh }, 1);
                }, 1);
            }, true);

            element.bind('$destroy', function() {
                deregistration();
            });
        }
    };
    });
