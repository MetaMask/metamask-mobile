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
exports.persistor = exports.store = void 0;
var toolkit_1 = require("@reduxjs/toolkit");
var redux_persist_1 = require("redux-persist");
var redux_saga_1 = require("redux-saga");
var sagas_1 = require("./sagas");
var reducers_1 = require("../reducers");
var EngineService_1 = require("../core/EngineService");
var core_1 = require("../core");
var LockManagerService_1 = require("../core/LockManagerService");
var network_store_1 = require("../util/test/network-store");
var utils_1 = require("../util/test/utils");
var redux_thunk_1 = require("redux-thunk");
var persistConfig_1 = require("./persistConfig");
// TODO: Improve type safety by using real Action types instead of `any`
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var pReducer = (0, redux_persist_1.persistReducer)(persistConfig_1["default"], reducers_1["default"]);
// TODO: Fix the Action type. It's set to `any` now because some of the
// TypeScript reducers have invalid actions
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any, import/no-mutable-exports
var store, persistor;
exports.store = store;
exports.persistor = persistor;
var createStoreAndPersistor = function () { return __awaiter(void 0, void 0, void 0, function () {
    var initialState, _c, sagaMiddleware, middlewares, createReduxFlipperDebugger, onPersistComplete;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                if (!utils_1.isE2E) return [3 /*break*/, 2];
                return [4 /*yield*/, network_store_1["default"].getState()];
            case 1:
                _c = _d.sent();
                return [3 /*break*/, 3];
            case 2:
                _c = undefined;
                _d.label = 3;
            case 3:
                initialState = _c;
                sagaMiddleware = (0, redux_saga_1["default"])();
                middlewares = [sagaMiddleware, redux_thunk_1["default"]];
                if (__DEV__) {
                    createReduxFlipperDebugger = require('redux-flipper')["default"];
                    middlewares.push(createReduxFlipperDebugger());
                }
                exports.store = store = (0, toolkit_1.configureStore)({
                    reducer: pReducer,
                    middleware: middlewares,
                    preloadedState: initialState
                });
                sagaMiddleware.run(sagas_1.rootSaga);
                onPersistComplete = function () {
                    /**
                     * EngineService.initalizeEngine(store) with SES/lockdown:
                     * Requires ethjs nested patches (lib->src)
                     * - ethjs/ethjs-query
                     * - ethjs/ethjs-contract
                     * Otherwise causing the following errors:
                     * - TypeError: Cannot assign to read only property 'constructor' of object '[object Object]'
                     * - Error: Requiring module "node_modules/ethjs/node_modules/ethjs-query/lib/index.js", which threw an exception: TypeError:
                     * -  V8: Cannot assign to read only property 'constructor' of object '[object Object]'
                     * -  JSC: Attempted to assign to readonly property
                     * - node_modules/babel-runtime/node_modules/regenerator-runtime/runtime.js
                     * - V8: TypeError: _$$_REQUIRE(...) is not a constructor
                     * - TypeError: undefined is not an object (evaluating 'TokenListController.tokenList')
                     * - V8: SES_UNHANDLED_REJECTION
                     */
                    store.dispatch({
                        type: 'TOGGLE_BASIC_FUNCTIONALITY',
                        basicFunctionalityEnabled: store.getState().settings.basicFunctionalityEnabled
                    });
                    EngineService_1["default"].initalizeEngine(store);
                    core_1.Authentication.init(store);
                    LockManagerService_1["default"].init(store);
                };
                exports.persistor = persistor = (0, redux_persist_1.persistStore)(store, null, onPersistComplete);
                return [2 /*return*/];
        }
    });
}); };
(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, createStoreAndPersistor()];
            case 1:
                _c.sent();
                return [2 /*return*/];
        }
    });
}); })();
