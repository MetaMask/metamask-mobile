"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
var snaps_rpc_methods_2 = require("@metamask/snaps-rpc-methods");
var permission_controller_2 = require("@metamask/permission-controller");
var constants_2 = require("../Permissions/constants");
// Snaps middleware
/*
    from extension https://github.dev/MetaMask/metamask-extension/blob/1d5e8a78400d7aaaf2b3cbdb30cff9399061df34/app/scripts/metamask-controller.js#L3830-L3861
    */
var snapMethodMiddlewareBuilder = function (
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
engineContext, 
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
controllerMessenger, origin, subjectType) {
    return (0, snaps_rpc_methods_2.createSnapsMethodMiddleware)(subjectType === permission_controller_2.SubjectType.Snap, {
        getUnlockPromise: function () { return Promise.resolve(); },
        getSnaps: controllerMessenger.call.bind(controllerMessenger, 'SnapController:getPermitted', origin),
        requestPermissions: function (requestedPermissions) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, engineContext.PermissionController.requestPermissions({ origin: origin }, requestedPermissions)];
                    case 1: return [2 /*return*/, _c.sent()];
                }
            });
        }); },
        getPermissions: engineContext.PermissionController.getPermissions.bind(engineContext.PermissionController, origin),
        getSnapFile: controllerMessenger.call.bind(controllerMessenger, 'SnapController:getFile', origin),
        installSnaps: controllerMessenger.call.bind(controllerMessenger, 'SnapController:install', origin),
        invokeSnap: engineContext.PermissionController.executeRestrictedMethod.bind(engineContext.PermissionController, origin, constants_2.RestrictedMethods.wallet_snap)
    });
};
exports["default"] = snapMethodMiddlewareBuilder;
///: END:ONLY_INCLUDE_IF
