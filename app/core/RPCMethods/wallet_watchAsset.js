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
var Engine_1 = require("../Engine");
var address_1 = require("../../util/address");
var store_1 = require("../../store");
var Permissions_1 = require("../Permissions");
var transactions_1 = require("../../util/transactions");
var error_1 = require("../../constants/error");
var networkController_1 = require("../../selectors/networkController");
var ethereumjs_util_1 = require("ethereumjs-util");
var controller_utils_1 = require("@metamask/controller-utils");
var wallet_watchAsset = function (_c) {
    var req = _c.req, res = _c.res, hostname = _c.hostname, checkTabActive = _c.checkTabActive;
    return __awaiter(void 0, void 0, void 0, function () {
        var AssetsContractController, _d, _e, address, decimals, image, symbol, type, TokensController, chainId, isValidTokenAddress, isTokenOnNetwork, permittedAccounts, selectedInternalAccountChecksummedAddress, interactingAddress, fetchedDecimals, fetchedSymbol, e_1, finalTokenSymbol, finalTokenDecimals;
        var _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    AssetsContractController = Engine_1["default"].context.AssetsContractController;
                    if (!req.params) {
                        throw new Error('wallet_watchAsset params is undefined');
                    }
                    _d = req.params, _e = _d.options, address = _e.address, decimals = _e.decimals, image = _e.image, symbol = _e.symbol, type = _d.type;
                    TokensController = Engine_1["default"].context.TokensController;
                    chainId = (0, networkController_1.selectChainId)(store_1.store.getState());
                    checkTabActive();
                    isValidTokenAddress = (0, ethereumjs_util_1.isValidAddress)(address);
                    if (!isValidTokenAddress) {
                        throw new Error(error_1.TOKEN_NOT_VALID);
                    }
                    return [4 /*yield*/, (0, transactions_1.isSmartContractAddress)(address, chainId)];
                case 1:
                    isTokenOnNetwork = _g.sent();
                    if (!isTokenOnNetwork) {
                        throw new Error(error_1.TOKEN_NOT_SUPPORTED_FOR_NETWORK);
                    }
                    return [4 /*yield*/, (0, Permissions_1.getPermittedAccounts)(hostname)];
                case 2:
                    permittedAccounts = _g.sent();
                    selectedInternalAccountChecksummedAddress = (0, controller_utils_1.toChecksumHexAddress)(Engine_1["default"].context.AccountsController.getSelectedAccount().address);
                    interactingAddress = (permittedAccounts === null || permittedAccounts === void 0 ? void 0 : permittedAccounts[0]) || selectedInternalAccountChecksummedAddress;
                    _g.label = 3;
                case 3:
                    _g.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, Promise.all([
                            AssetsContractController.getERC20TokenDecimals(address),
                            AssetsContractController.getERC721AssetSymbol(address),
                        ])];
                case 4:
                    _f = _g.sent(), fetchedDecimals = _f[0], fetchedSymbol = _f[1];
                    return [3 /*break*/, 6];
                case 5:
                    e_1 = _g.sent();
                    return [3 /*break*/, 6];
                case 6:
                    finalTokenSymbol = fetchedSymbol !== null && fetchedSymbol !== void 0 ? fetchedSymbol : symbol;
                    finalTokenDecimals = fetchedDecimals !== null && fetchedDecimals !== void 0 ? fetchedDecimals : decimals;
                    return [4 /*yield*/, TokensController.watchAsset({
                            asset: {
                                address: address,
                                symbol: finalTokenSymbol,
                                // @ts-expect-error TODO: Fix decimal type
                                decimals: finalTokenDecimals,
                                image: image
                            },
                            type: type,
                            interactingAddress: (0, address_1.safeToChecksumAddress)(interactingAddress)
                        })];
                case 7:
                    _g.sent();
                    res.result = true;
                    return [2 /*return*/];
            }
        });
    });
};
exports["default"] = wallet_watchAsset;
