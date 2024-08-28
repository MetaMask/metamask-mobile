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
exports.version = exports.migrations = exports.asyncifyMigrations = exports.migrationList = void 0;
var _000_1 = require("./000");
var _001_1 = require("./001");
var _002_1 = require("./002");
var _003_1 = require("./003");
var _004_1 = require("./004");
var _005_1 = require("./005");
var _006_1 = require("./006");
var _007_1 = require("./007");
var _008_1 = require("./008");
var _009_1 = require("./009");
var _010_1 = require("./010");
var _011_1 = require("./011");
var _012_1 = require("./012");
var _013_1 = require("./013");
var _014_1 = require("./014");
var _015_1 = require("./015");
var _016_1 = require("./016");
var _017_1 = require("./017");
var _018_1 = require("./018");
var _019_1 = require("./019");
var _020_1 = require("./020");
var _021_1 = require("./021");
var _022_1 = require("./022");
var _023_1 = require("./023");
var _024_1 = require("./024");
var _025_1 = require("./025");
var _026_1 = require("./026");
var _027_1 = require("./027");
var _028_1 = require("./028");
var _029_1 = require("./029");
var _030_1 = require("./030");
var _031_1 = require("./031");
var _032_1 = require("./032");
var _033_1 = require("./033");
var _034_1 = require("./034");
var _035_1 = require("./035");
var _036_1 = require("./036");
var _037_1 = require("./037");
var _038_1 = require("./038");
var _039_1 = require("./039");
var _040_1 = require("./040");
var _041_1 = require("./041");
var _042_1 = require("./042");
var _043_1 = require("./043");
var _044_1 = require("./044");
var _045_1 = require("./045");
var _046_1 = require("./046");
var _047_1 = require("./047");
var _048_1 = require("./048");
var _049_1 = require("./049");
var _050_1 = require("./050");
/**
 * Contains both asynchronous and synchronous migrations
 */
exports.migrationList = {
    0: _000_1["default"],
    1: _001_1["default"],
    2: _002_1["default"],
    3: _003_1["default"],
    4: _004_1["default"],
    5: _005_1["default"],
    6: _006_1["default"],
    7: _007_1["default"],
    8: _008_1["default"],
    9: _009_1["default"],
    10: _010_1["default"],
    11: _011_1["default"],
    12: _012_1["default"],
    13: _013_1["default"],
    14: _014_1["default"],
    15: _015_1["default"],
    16: _016_1["default"],
    17: _017_1["default"],
    18: _018_1["default"],
    19: _019_1["default"],
    20: _020_1["default"],
    21: _021_1["default"],
    22: _022_1["default"],
    23: _023_1["default"],
    24: _024_1["default"],
    25: _025_1["default"],
    26: _026_1["default"],
    27: _027_1["default"],
    28: _028_1["default"],
    29: _029_1["default"],
    30: _030_1["default"],
    31: _031_1["default"],
    32: _032_1["default"],
    33: _033_1["default"],
    34: _034_1["default"],
    35: _035_1["default"],
    36: _036_1["default"],
    37: _037_1["default"],
    38: _038_1["default"],
    39: _039_1["default"],
    40: _040_1["default"],
    41: _041_1["default"],
    42: _042_1["default"],
    43: _043_1["default"],
    44: _044_1["default"],
    45: _045_1["default"],
    46: _046_1["default"],
    47: _047_1["default"],
    48: _048_1["default"],
    49: _049_1["default"],
    50: _050_1["default"]
};
// Enable both synchronous and asynchronous migrations
var asyncifyMigrations = function (inputMigrations) {
    return Object.entries(inputMigrations).reduce(function (newMigrations, _c) {
        var migrationNumber = _c[0], migrationFunction = _c[1];
        // Handle migrations as async
        var asyncMigration = function (incomingState) { return __awaiter(void 0, void 0, void 0, function () {
            var state;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, incomingState];
                    case 1:
                        state = _c.sent();
                        return [2 /*return*/, migrationFunction(state)];
                }
            });
        }); };
        newMigrations[migrationNumber] = asyncMigration;
        return newMigrations;
    }, {});
};
exports.asyncifyMigrations = asyncifyMigrations;
// Convert all migrations to async
exports.migrations = (0, exports.asyncifyMigrations)(exports.migrationList);
// The latest (i.e. highest) version number.
exports.version = Object.keys(exports.migrations).length - 1;
