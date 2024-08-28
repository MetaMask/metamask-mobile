"use strict";
exports.__esModule = true;
exports.DevLogger = void 0;
exports.DevLogger = {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    log: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (process.env.SDK_DEV === 'DEV') {
            // eslint-disable-next-line no-console
            console.debug.apply(console, args);
        }
    }
};
exports["default"] = exports.DevLogger;
