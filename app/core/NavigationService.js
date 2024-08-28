"use strict";
exports.__esModule = true;
var NavigationService = /** @class */ (function () {
    function NavigationService() {
    }
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    NavigationService.prototype.setNavigationRef = function (navRef) {
        this.navigation = navRef;
    };
    return NavigationService;
}());
exports["default"] = new NavigationService();
