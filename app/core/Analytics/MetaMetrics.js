"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _MetaMetrics_isConfigured, _MetaMetrics_isMetaMetricsEnabled, _MetaMetrics_getIsDataRecordedFromPrefs, _MetaMetrics_getDeleteRegulationDateFromPrefs, _MetaMetrics_getDeleteRegulationIdFromPrefs, _MetaMetrics_setIsDataRecorded, _MetaMetrics_setDeleteRegulationId, _MetaMetrics_setDeleteRegulationCreationDate, _MetaMetrics_getMetaMetricsId, _MetaMetrics_resetMetaMetricsId, _MetaMetrics_identify, _MetaMetrics_group, _MetaMetrics_trackEvent, _MetaMetrics_reset, _MetaMetrics_storeMetricsOptInPreference, _MetaMetrics_getSegmentApiHeaders, _MetaMetrics_createDataDeletionTask, _MetaMetrics_checkDataDeletionTaskStatus;
exports.__esModule = true;
var analytics_react_native_1 = require("@segment/analytics-react-native");
var axios_1 = require("axios");
var storage_wrapper_1 = require("../../store/storage-wrapper");
var Logger_1 = require("../../util/Logger");
var storage_1 = require("../../constants/storage");
var MetaMetrics_types_1 = require("./MetaMetrics.types");
var MetaMetrics_constants_1 = require("./MetaMetrics.constants");
var uuid_2 = require("uuid");
var generateDeviceAnalyticsMetaData_1 = require("../../util/metrics/DeviceAnalyticsMetaData/generateDeviceAnalyticsMetaData");
var generateUserProfileAnalyticsMetaData_1 = require("../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData");
var utils_1 = require("../../util/test/utils");
var convertLegacyProperties_1 = require("../../util/events/convertLegacyProperties");
/**
 * MetaMetrics using Segment as the analytics provider.
 *
 * ## Configuration
 * Initialize the MetaMetrics system by calling {@link configure} method.
 * This should be done once in the app lifecycle.
 * Ideally in the app entry point.
 * ```
 * const metrics = MetaMetrics.getInstance();
 * await metrics.configure();
 * ```
 *
 * ## Base tracking usage
 * ```
 * const metrics = MetaMetrics.getInstance();
 * metrics.trackEvent(event, { property: 'value' });
 * ```
 *
 * or using the new properties structure:
 * ```
 * const metrics = MetaMetrics.getInstance();
 * metrics.trackEvent(event, {
 *   properties: {property: 'value' },
 *   sensitiveProperties: {sensitiveProperty: 'sensitiveValue' }
 * );
 * ```
 *
 * ## Enabling MetaMetrics
 * Enable the metrics when user agrees (optin or settings).
 * ```
 * const metrics = MetaMetrics.getInstance();
 * await metrics.enable();
 *```
 *
 * ## Disabling MetaMetrics
 * Disable the metrics when user refuses (optout or settings).
 * ```
 * const metrics = MetaMetrics.getInstance();
 * await metrics.enable(false);
 * ```
 *
 * ## Identify user
 * By default all metrics are anonymous using a single hardcoded anonymous ID.
 * Until you identify the user, all events will be associated to this anonymous ID.
 * ```
 * const metrics = MetaMetrics.getInstance();
 * metrics.addTraitsToUser({ property: 'value' });
 * ```
 *
 * This will associate the user to a new generated unique ID and all future events will be associated to this user.
 *
 * ## Reset user
 * If you want to reset the user ID, you can call the reset method.
 * This will revert the user to the anonymous ID and generate a new unique ID.
 * ```
 * const metrics = MetaMetrics.getInstance();
 * metrics.reset();
 * ```
 * @remarks prefer {@link useMetrics} hook in your components
 *
 * @see METAMETRICS_ANONYMOUS_ID
 */
var MetaMetrics = /** @class */ (function () {
    /**
     * Protected constructor to prevent direct instantiation
     *
     * Use {@link getInstance} instead
     *
     * @protected
     * @param segmentClient - Segment client instance
     */
    function MetaMetrics(segmentClient) {
        var _this = this;
        /**
         * indicates if MetaMetrics is initialised and ready to use
         *
         * @private
         */
        _MetaMetrics_isConfigured.set(this, false);
        /**
         * Indicate if MetaMetrics is enabled or disabled
         *
         * MetaMetrics is disabled by default, user has to explicitly opt-in
         * @private
         */
        this.enabled = false;
        /**
         * Indicate if data has been recorded since the last deletion request
         * @private
         */
        this.dataRecorded = false;
        /**
         * Retrieve state of metrics from the preference
         *
         * Defaults to disabled if not explicitely enabled
         * @private
         * @returns Promise containing the enabled state
         */
        _MetaMetrics_isMetaMetricsEnabled.set(this, function () { return __awaiter(_this, void 0, void 0, function () {
            var enabledPref;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, storage_wrapper_1["default"].getItem(storage_1.METRICS_OPT_IN)];
                    case 1:
                        enabledPref = _c.sent();
                        this.enabled = storage_1.AGREED === enabledPref;
                        if (__DEV__)
                            Logger_1["default"].log("Current MetaMatrics enable state: ".concat(this.enabled));
                        return [2 /*return*/, this.enabled];
                }
            });
        }); });
        /**
         * Retrieve the analytics recording status from the preference
         * @private
         */
        _MetaMetrics_getIsDataRecordedFromPrefs.set(this, function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, storage_wrapper_1["default"].getItem(storage_1.ANALYTICS_DATA_RECORDED)];
                case 1: return [2 /*return*/, (_c.sent()) === 'true'];
            }
        }); }); });
        /**
         * Retrieve the analytics deletion request date from the preference
         * @private
         */
        _MetaMetrics_getDeleteRegulationDateFromPrefs.set(this, function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, storage_wrapper_1["default"].getItem(storage_1.ANALYTICS_DATA_DELETION_DATE)];
                case 1: return [2 /*return*/, _c.sent()];
            }
        }); }); });
        /**
         * Retrieve the analytics deletion regulation ID from the preference
         * @private
         */
        _MetaMetrics_getDeleteRegulationIdFromPrefs.set(this, function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, storage_wrapper_1["default"].getItem(storage_1.METAMETRICS_DELETION_REGULATION_ID)];
                case 1: return [2 /*return*/, _c.sent()];
            }
        }); }); });
        /**
         * Persist the analytics recording status
         * @private
         * @param isDataRecorded - analytics recording status
         */
        _MetaMetrics_setIsDataRecorded.set(this, function (isDataRecorded) {
            if (isDataRecorded === void 0) { isDataRecorded = false; }
            return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            this.dataRecorded = isDataRecorded;
                            return [4 /*yield*/, storage_wrapper_1["default"].setItem(storage_1.ANALYTICS_DATA_RECORDED, String(isDataRecorded))];
                        case 1:
                            _c.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
        /**
         * Set and store Segment's data deletion regulation ID
         * @private
         * @param deleteRegulationId - data deletion regulation ID returned by Segment
         * delete API or undefined if no regulation in progress
         */
        _MetaMetrics_setDeleteRegulationId.set(this, function (deleteRegulationId) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        this.deleteRegulationId = deleteRegulationId;
                        return [4 /*yield*/, storage_wrapper_1["default"].setItem(storage_1.METAMETRICS_DELETION_REGULATION_ID, deleteRegulationId)];
                    case 1:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        /**
         * Set and store the delete regulation request creation date
         */
        _MetaMetrics_setDeleteRegulationCreationDate.set(this, function () { return __awaiter(_this, void 0, void 0, function () {
            var currentDate, day, month, year, deletionDate;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        currentDate = new Date();
                        day = currentDate.getUTCDate();
                        month = currentDate.getUTCMonth() + 1;
                        year = currentDate.getUTCFullYear();
                        deletionDate = "".concat(day, "/").concat(month, "/").concat(year);
                        this.deleteRegulationDate = deletionDate;
                        // similar to the one used in the legacy Analytics
                        return [4 /*yield*/, storage_wrapper_1["default"].setItem(storage_1.ANALYTICS_DATA_DELETION_DATE, deletionDate)];
                    case 1:
                        // similar to the one used in the legacy Analytics
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        /**
         * Retrieve the analytics user ID from references
         *
         * Generates a new ID if none is found
         *
         * @returns Promise containing the user ID
         */
        _MetaMetrics_getMetaMetricsId.set(this, function () { return __awaiter(_this, void 0, void 0, function () {
            var legacyId, metametricsId;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, storage_wrapper_1["default"].getItem(storage_1.MIXPANEL_METAMETRICS_ID)];
                    case 1:
                        legacyId = _c.sent();
                        if (!legacyId) return [3 /*break*/, 3];
                        this.metametricsId = legacyId;
                        return [4 /*yield*/, storage_wrapper_1["default"].setItem(storage_1.METAMETRICS_ID, legacyId)];
                    case 2:
                        _c.sent();
                        return [2 /*return*/, legacyId];
                    case 3: return [4 /*yield*/, storage_wrapper_1["default"].getItem(storage_1.METAMETRICS_ID)];
                    case 4:
                        metametricsId = _c.sent();
                        if (!!metametricsId) return [3 /*break*/, 6];
                        // keep the id format compatible with MixPanel but base it on a UUIDv4
                        this.metametricsId = (0, uuid_2.v4)();
                        return [4 /*yield*/, storage_wrapper_1["default"].setItem(storage_1.METAMETRICS_ID, this.metametricsId)];
                    case 5:
                        _c.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        this.metametricsId = metametricsId;
                        _c.label = 7;
                    case 7: return [2 /*return*/, this.metametricsId];
                }
            });
        }); });
        /**
         * Reset the analytics user ID and Segment SDK state
         */
        _MetaMetrics_resetMetaMetricsId.set(this, function () { return __awaiter(_this, void 0, void 0, function () {
            var _c, error_1;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, storage_wrapper_1["default"].setItem(storage_1.METAMETRICS_ID, '')];
                    case 1:
                        _d.sent();
                        _c = this;
                        return [4 /*yield*/, __classPrivateFieldGet(this, _MetaMetrics_getMetaMetricsId, "f").call(this)];
                    case 2:
                        _c.metametricsId = _d.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _d.sent();
                        Logger_1["default"].error(error_1, 'Error resetting MetaMetrics ID');
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
        /**
         * Associate traits or properties to an user
         *
         * It only takes traits as parameter as we want to keep the user ID controlled by the class
         *
         * @param userTraits - Object containing user relevant traits or properties (optional)
         *
         * @see https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/#identify
         */
        _MetaMetrics_identify.set(this, function (userTraits) { return __awaiter(_this, void 0, void 0, function () {
            var _c;
            return __generator(this, function (_d) {
                (_c = this.segmentClient) === null || _c === void 0 ? void 0 : _c.identify(this.metametricsId, userTraits);
                return [2 /*return*/];
            });
        }); });
        /**
         * Associate a user to a specific group
         *
         * @param groupId - Group ID to associate user
         * @param groupTraits - Object containing group relevant traits or properties (optional)
         *
         * @see https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/#group
         */
        _MetaMetrics_group.set(this, function (groupId, groupTraits) {
            var _c;
            (_c = _this.segmentClient) === null || _c === void 0 ? void 0 : _c.group(groupId, groupTraits);
        });
        /**
         * Track an analytics event
         *
         * @param event - Analytics event name
         * @param properties - Object containing any event relevant traits or properties (optional)
         * @param saveDataRecording - param to skip saving the data recording flag (optional)
         * @see https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/#track
         */
        _MetaMetrics_trackEvent.set(this, function (event, properties, saveDataRecording) {
            var _c;
            if (saveDataRecording === void 0) { saveDataRecording = true; }
            (_c = _this.segmentClient) === null || _c === void 0 ? void 0 : _c.track(event, properties);
            saveDataRecording &&
                !_this.dataRecorded &&
                __classPrivateFieldGet(_this, _MetaMetrics_setIsDataRecorded, "f").call(_this, true)["catch"](function (error) {
                    // here we don't want to handle the error, there's nothing we can do
                    // so we just catch and log it async and do not await for return
                    // as this must not block the event tracking
                    Logger_1["default"].error(error, 'Analytics Data Record Error');
                });
        });
        /**
         * Clear the internal state of the library for the current user and group
         *
         * @see https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/#reset
         */
        _MetaMetrics_reset.set(this, function () {
            var _c;
            (_c = _this.segmentClient) === null || _c === void 0 ? void 0 : _c.reset(true);
        });
        /**
         * Update the user analytics preference and
         * store in StorageWrapper
         *
         * @param enabled - Boolean indicating if opts-in ({@link AGREED}) or opts-out ({@link DENIED})
         */
        _MetaMetrics_storeMetricsOptInPreference.set(this, function (enabled) { return __awaiter(_this, void 0, void 0, function () {
            var error_2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, storage_wrapper_1["default"].setItem(storage_1.METRICS_OPT_IN, enabled ? storage_1.AGREED : storage_1.DENIED)];
                    case 1:
                        _c.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _c.sent();
                        Logger_1["default"].error(error_2, 'Error storing MetaMetrics enable state');
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); });
        /**
         * Get the Segment API HTTP headers
         * @private
         */
        _MetaMetrics_getSegmentApiHeaders.set(this, function () { return ({
            'Content-Type': 'application/vnd.segment.v1+json'
        }); });
        /**
         * Generate a new delete regulation for the user
         *
         * This is necessary to respect the GDPR and CCPA regulations
         *
         * @see https://segment.com/docs/privacy/user-deletion-and-suppression/
         */
        _MetaMetrics_createDataDeletionTask.set(this, function () { return __awaiter(_this, void 0, void 0, function () {
            var segmentSourceId, segmentRegulationEndpoint, regulationType, response, data, error_3;
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        segmentSourceId = process.env.SEGMENT_DELETE_API_SOURCE_ID;
                        segmentRegulationEndpoint = process.env.SEGMENT_REGULATIONS_ENDPOINT;
                        if (!segmentSourceId || !segmentRegulationEndpoint) {
                            return [2 /*return*/, {
                                    status: MetaMetrics_types_1.DataDeleteResponseStatus.error,
                                    error: 'Segment API source ID or endpoint not found'
                                }];
                        }
                        regulationType = 'DELETE_ONLY';
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 6, , 7]);
                        return [4 /*yield*/, (0, axios_1["default"])({
                                url: "".concat(segmentRegulationEndpoint, "/regulations/sources/").concat(segmentSourceId),
                                method: 'POST',
                                headers: __classPrivateFieldGet(this, _MetaMetrics_getSegmentApiHeaders, "f").call(this),
                                data: JSON.stringify({
                                    regulationType: regulationType,
                                    subjectType: 'USER_ID',
                                    subjectIds: [this.metametricsId]
                                })
                            })];
                    case 2:
                        response = _d.sent();
                        data = response.data;
                        return [4 /*yield*/, __classPrivateFieldGet(this, _MetaMetrics_setDeleteRegulationId, "f").call(this, (_c = data === null || data === void 0 ? void 0 : data.data) === null || _c === void 0 ? void 0 : _c.regulateId)];
                    case 3:
                        _d.sent();
                        return [4 /*yield*/, __classPrivateFieldGet(this, _MetaMetrics_setDeleteRegulationCreationDate, "f").call(this)];
                    case 4:
                        _d.sent(); // set to current date
                        return [4 /*yield*/, __classPrivateFieldGet(this, _MetaMetrics_setIsDataRecorded, "f").call(this, false)];
                    case 5:
                        _d.sent(); // indicate no data recorded since request
                        return [2 /*return*/, { status: MetaMetrics_types_1.DataDeleteResponseStatus.ok }];
                    case 6:
                        error_3 = _d.sent();
                        Logger_1["default"].error(error_3, 'Analytics Deletion Task Error');
                        return [2 /*return*/, {
                                status: MetaMetrics_types_1.DataDeleteResponseStatus.error,
                                error: 'Analytics Deletion Task Error'
                            }];
                    case 7: return [2 /*return*/];
                }
            });
        }); });
        /**
         * Check a Deletion Task using Segment API
         *
         * @returns promise for Object indicating the status of the deletion request
         * @see https://docs.segmentapis.com/tag/Deletion-and-Suppression#operation/getRegulation
         */
        _MetaMetrics_checkDataDeletionTaskStatus.set(this, function () { return __awaiter(_this, void 0, void 0, function () {
            var segmentRegulationEndpoint, response, data, status_1, error_4;
            var _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        segmentRegulationEndpoint = process.env.SEGMENT_REGULATIONS_ENDPOINT;
                        if (!this.deleteRegulationId || !segmentRegulationEndpoint) {
                            return [2 /*return*/, {
                                    status: MetaMetrics_types_1.DataDeleteResponseStatus.error,
                                    dataDeleteStatus: MetaMetrics_types_1.DataDeleteStatus.unknown
                                }];
                        }
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, axios_1["default"])({
                                url: "".concat(segmentRegulationEndpoint, "/regulations/").concat(this.deleteRegulationId),
                                method: 'GET',
                                headers: __classPrivateFieldGet(this, _MetaMetrics_getSegmentApiHeaders, "f").call(this)
                            })];
                    case 2:
                        response = _e.sent();
                        data = response.data;
                        status_1 = (_d = (_c = data === null || data === void 0 ? void 0 : data.data) === null || _c === void 0 ? void 0 : _c.regulation) === null || _d === void 0 ? void 0 : _d.overallStatus;
                        return [2 /*return*/, {
                                status: MetaMetrics_types_1.DataDeleteResponseStatus.ok,
                                dataDeleteStatus: status_1 || MetaMetrics_types_1.DataDeleteStatus.unknown
                            }];
                    case 3:
                        error_4 = _e.sent();
                        Logger_1["default"].error(error_4, 'Analytics Deletion Task Check Error');
                        return [2 /*return*/, {
                                status: MetaMetrics_types_1.DataDeleteResponseStatus.error,
                                dataDeleteStatus: MetaMetrics_types_1.DataDeleteStatus.unknown
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
        /**
         * Configure MetaMetrics system
         *
         * @example
         * const metrics = MetaMetrics.getInstance();
         * await metrics.configure() && metrics.enable();
         *
         * @remarks Instance has to be configured before being used
         * Calling configure multiple times will not configure the instance again
         *
         * @returns Promise indicating if MetaMetrics configuration was successful or not
         */
        this.configure = function () { return __awaiter(_this, void 0, void 0, function () {
            var _c, _d, _e, _f, _g, consolidatedTraits, error_5;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        if (__classPrivateFieldGet(this, _MetaMetrics_isConfigured, "f"))
                            return [2 /*return*/, true];
                        _h.label = 1;
                    case 1:
                        _h.trys.push([1, 8, , 9]);
                        _c = this;
                        return [4 /*yield*/, __classPrivateFieldGet(this, _MetaMetrics_isMetaMetricsEnabled, "f").call(this)];
                    case 2:
                        _c.enabled = _h.sent();
                        // get the user unique id when initializing
                        _d = this;
                        return [4 /*yield*/, __classPrivateFieldGet(this, _MetaMetrics_getMetaMetricsId, "f").call(this)];
                    case 3:
                        // get the user unique id when initializing
                        _d.metametricsId = _h.sent();
                        _e = this;
                        return [4 /*yield*/, __classPrivateFieldGet(this, _MetaMetrics_getDeleteRegulationIdFromPrefs, "f").call(this)];
                    case 4:
                        _e.deleteRegulationId = _h.sent();
                        _f = this;
                        return [4 /*yield*/, __classPrivateFieldGet(this, _MetaMetrics_getDeleteRegulationDateFromPrefs, "f").call(this)];
                    case 5:
                        _f.deleteRegulationDate =
                            _h.sent();
                        _g = this;
                        return [4 /*yield*/, __classPrivateFieldGet(this, _MetaMetrics_getIsDataRecordedFromPrefs, "f").call(this)];
                    case 6:
                        _g.dataRecorded = _h.sent();
                        __classPrivateFieldSet(this, _MetaMetrics_isConfigured, true, "f");
                        consolidatedTraits = __assign(__assign({}, (0, generateDeviceAnalyticsMetaData_1["default"])()), (0, generateUserProfileAnalyticsMetaData_1["default"])());
                        return [4 /*yield*/, this.addTraitsToUser(consolidatedTraits)];
                    case 7:
                        _h.sent();
                        if (__DEV__)
                            Logger_1["default"].log("MetaMetrics configured with ID: ".concat(this.metametricsId));
                        return [3 /*break*/, 9];
                    case 8:
                        error_5 = _h.sent();
                        Logger_1["default"].error(error_5, 'Error initializing MetaMetrics');
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/, __classPrivateFieldGet(this, _MetaMetrics_isConfigured, "f")];
                }
            });
        }); };
        /**
         * Enable or disable MetaMetrics
         *
         * @param enable - Boolean indicating if MetaMetrics should be enabled or disabled
         */
        this.enable = function (enable) {
            if (enable === void 0) { enable = true; }
            return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            this.enabled = enable;
                            return [4 /*yield*/, __classPrivateFieldGet(this, _MetaMetrics_storeMetricsOptInPreference, "f").call(this, this.enabled)];
                        case 1:
                            _c.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Check if MetaMetrics is enabled
         *
         * @returns Boolean indicating if MetaMetrics is enabled or disabled
         */
        this.isEnabled = function () { return _this.enabled; };
        /**
         * Add traits to the user and identify them
         *
         * @param userTraits list of traits to add to the user
         *
         * @remarks method can be called multiple times,
         * new traits are sent with the underlying identification call to Segment
         * and user traits are updated with the latest ones
         */
        this.addTraitsToUser = function (userTraits) {
            if (_this.enabled) {
                return __classPrivateFieldGet(_this, _MetaMetrics_identify, "f").call(_this, userTraits);
            }
            return Promise.resolve();
        };
        /**
         * Add a user to a specific group
         *
         * @param groupId - Any unique string to associate user with
         * @param groupTraits - group relevant traits or properties (optional)
         */
        this.group = function (groupId, groupTraits) {
            if (_this.enabled) {
                __classPrivateFieldGet(_this, _MetaMetrics_group, "f").call(_this, groupId, groupTraits);
            }
            return Promise.resolve();
        };
        /**
         * Track an event
         *
         * The function allows to track non-anonymous and anonymous events:
         * - with properties and without properties,
         * - with a unique trackEvent function
         *
         * ## Regular non-anonymous events
         * Regular events are tracked with the user ID and can have properties set
         *
         * ## Anonymous events
         * Anonymous tracking track sends two events: one with the anonymous ID and one with the user ID
         * - The anonymous event includes sensitive properties so you can know **what** but not **who**
         * - The non-anonymous event has either no properties or not sensitive one so you can know **who** but not **what**
         *
         * @example basic non-anonymous tracking with no properties:
         * trackEvent(MetaMetricsEvents.ONBOARDING_STARTED);
         *
         * @example track with non-anonymous properties:
         * trackEvent(MetaMetricsEvents.BROWSER_SEARCH_USED, {
         *   option_chosen: 'Browser Bottom Bar Menu',
         *   number_of_tabs: undefined,
         * });
         *
         * @example you can also track with non-anonymous properties (new properties structure):
         * trackEvent(MetaMetricsEvents.BROWSER_SEARCH_USED, {
         *   properties: {
         *     option_chosen: 'Browser Bottom Bar Menu',
         *     number_of_tabs: undefined,
         *   },
         * });
         *
         * @example track an anonymous event (without properties)
         * trackEvent(MetaMetricsEvents.SWAP_COMPLETED);
         *
         * @example track an anonymous event with properties
         * trackEvent(MetaMetricsEvents.GAS_FEES_CHANGED, {
         *   sensitiveProperties: { ...parameters },
         * });
         *
         * @example track an event with both anonymous and non-anonymous properties
         * trackEvent(MetaMetricsEvents.MY_EVENT, {
         *   properties: { ...nonAnonymousParameters },
         *   sensitiveProperties: { ...anonymousParameters },
         * });
         *
         * @param event - Analytics event name
         * @param properties - Object containing any event relevant traits or properties (optional).
         * @param saveDataRecording - param to skip saving the data recording flag (optional)
         */
        this.trackEvent = function (event, properties, saveDataRecording) {
            if (properties === void 0) { properties = {}; }
            if (saveDataRecording === void 0) { saveDataRecording = true; }
            if (!_this.enabled) {
                return;
            }
            // if event does not have properties, only send the non-anonymous empty event
            // and return to prevent any additional processing
            if (!properties || Object.keys(properties).length === 0) {
                __classPrivateFieldGet(_this, _MetaMetrics_trackEvent, "f").call(_this, event === null || event === void 0 ? void 0 : event.category, __assign({ anonymous: false }, event === null || event === void 0 ? void 0 : event.properties), saveDataRecording);
                return;
            }
            // if event has properties, convert then to the new EventProperties format,
            var convertedProperties = (0, convertLegacyProperties_1["default"])(properties);
            // Log all non-anonymous properties, or an empty event if there's no non-anon props.
            // In any case, there's a non-anon event tracked, see MetaMetrics.test.ts Tracking table.
            __classPrivateFieldGet(_this, _MetaMetrics_trackEvent, "f").call(_this, event === null || event === void 0 ? void 0 : event.category, __assign({ anonymous: false }, convertedProperties.properties), saveDataRecording);
            // Track all anonymous properties in an anonymous event
            if (convertedProperties.sensitiveProperties &&
                Object.keys(convertedProperties.sensitiveProperties).length) {
                __classPrivateFieldGet(_this, _MetaMetrics_trackEvent, "f").call(_this, event.category, __assign(__assign({ anonymous: true }, convertedProperties.sensitiveProperties), convertedProperties.properties), saveDataRecording);
            }
        };
        /**
         * Clear the internal state of the library for the current user and reset the user ID
         */
        this.reset = function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        __classPrivateFieldGet(this, _MetaMetrics_reset, "f").call(this);
                        return [4 /*yield*/, __classPrivateFieldGet(this, _MetaMetrics_resetMetaMetricsId, "f").call(this)];
                    case 1:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); };
        /**
         * Forces the Segment SDK to flush all events in the queue
         *
         * This will send all events to Segment without waiting for
         * the queue to be full or the timeout to be reached
         */
        this.flush = function () { return __awaiter(_this, void 0, void 0, function () { var _c; return __generator(this, function (_d) {
            return [2 /*return*/, (_c = this.segmentClient) === null || _c === void 0 ? void 0 : _c.flush()];
        }); }); };
        /**
         * Create a new delete regulation for the user
         *
         * @remarks This is necessary to respect the GDPR and CCPA regulations
         *
         * @returns Promise containing the status of the request
         *
         * @see https://segment.com/docs/privacy/user-deletion-and-suppression/
         * @see https://docs.segmentapis.com/tag/Deletion-and-Suppression#operation/createSourceRegulation
         */
        this.createDataDeletionTask = function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_c) {
            return [2 /*return*/, __classPrivateFieldGet(this, _MetaMetrics_createDataDeletionTask, "f").call(this)];
        }); }); };
        /**
         * Check the latest delete regulation status
         * @returns Promise containing the date, delete status and collected data flag
         */
        this.checkDataDeleteStatus = function () { return __awaiter(_this, void 0, void 0, function () {
            var status, dataDeletionTaskStatus, error_6;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        status = {
                            deletionRequestDate: undefined,
                            dataDeletionRequestStatus: MetaMetrics_types_1.DataDeleteStatus.unknown,
                            hasCollectedDataSinceDeletionRequest: false
                        };
                        if (!this.deleteRegulationId) return [3 /*break*/, 5];
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, __classPrivateFieldGet(this, _MetaMetrics_checkDataDeletionTaskStatus, "f").call(this)];
                    case 2:
                        dataDeletionTaskStatus = _c.sent();
                        status.dataDeletionRequestStatus =
                            dataDeletionTaskStatus.dataDeleteStatus;
                        return [3 /*break*/, 4];
                    case 3:
                        error_6 = _c.sent();
                        Logger_1["default"].log('Error checkDataDeleteStatus -', error_6);
                        status.dataDeletionRequestStatus = MetaMetrics_types_1.DataDeleteStatus.unknown;
                        return [3 /*break*/, 4];
                    case 4:
                        status.deletionRequestDate = this.deleteRegulationDate;
                        status.hasCollectedDataSinceDeletionRequest = this.dataRecorded;
                        _c.label = 5;
                    case 5: return [2 /*return*/, status];
                }
            });
        }); };
        /**
         * Get the latest delete regulation request date
         *
         * @returns the date as a DD/MM/YYYY string
         */
        this.getDeleteRegulationCreationDate = function () {
            return _this.deleteRegulationDate;
        };
        /**
         * Get the latest delete regulation request id
         *
         * @returns the id string
         */
        this.getDeleteRegulationId = function () { return _this.deleteRegulationId; };
        /**
         * Indicate if events have been recorded since the last deletion request
         *
         * @returns true if events have been recorded since the last deletion request
         */
        this.isDataRecorded = function () { return _this.dataRecorded; };
        /**
         * Get the current MetaMetrics ID
         *
         * @returns the current MetaMetrics ID
         */
        this.getMetaMetricsId = function () { return __awaiter(_this, void 0, void 0, function () { var _c; var _d; return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (!((_d = this.metametricsId) !== null && _d !== void 0)) return [3 /*break*/, 1];
                    _c = _d;
                    return [3 /*break*/, 3];
                case 1: return [4 /*yield*/, __classPrivateFieldGet(this, _MetaMetrics_getMetaMetricsId, "f").call(this)];
                case 2:
                    _c = (_e.sent());
                    _e.label = 3;
                case 3: return [2 /*return*/, _c];
            }
        }); }); };
        this.segmentClient = segmentClient;
    }
    /**
     * Get an instance of the MetaMetrics system
     *
     * @example const metrics = MetaMetrics.getInstance();
     * @returns non configured MetaMetrics instance
     * @remarks Instance has to be configured before being used, call {@link configure} method asynchrounously
     */
    MetaMetrics.getInstance = function () {
        if (!this.instance) {
            var config = {
                writeKey: process.env.SEGMENT_WRITE_KEY,
                proxy: process.env.SEGMENT_PROXY_URL,
                debug: __DEV__,
                anonymousId: MetaMetrics_constants_1.METAMETRICS_ANONYMOUS_ID,
                // allow custom flush interval and event limit for dev and testing
                // each is optional and can be set in the .js.env file
                // if not set, the default values from the Segment SDK will be used
                flushInterval: process.env.SEGMENT_FLUSH_INTERVAL,
                flushAt: process.env.SEGMENT_FLUSH_EVENT_LIMIT
            };
            if (__DEV__)
                Logger_1["default"].log("MetaMetrics client configured with: ".concat(JSON.stringify(config, null, 2)));
            var segmentClient = utils_1.isE2E ? undefined : (0, analytics_react_native_1.createClient)(config);
            this.instance = new MetaMetrics(segmentClient);
        }
        return this.instance;
    };
    return MetaMetrics;
}());
_MetaMetrics_isConfigured = new WeakMap(), _MetaMetrics_isMetaMetricsEnabled = new WeakMap(), _MetaMetrics_getIsDataRecordedFromPrefs = new WeakMap(), _MetaMetrics_getDeleteRegulationDateFromPrefs = new WeakMap(), _MetaMetrics_getDeleteRegulationIdFromPrefs = new WeakMap(), _MetaMetrics_setIsDataRecorded = new WeakMap(), _MetaMetrics_setDeleteRegulationId = new WeakMap(), _MetaMetrics_setDeleteRegulationCreationDate = new WeakMap(), _MetaMetrics_getMetaMetricsId = new WeakMap(), _MetaMetrics_resetMetaMetricsId = new WeakMap(), _MetaMetrics_identify = new WeakMap(), _MetaMetrics_group = new WeakMap(), _MetaMetrics_trackEvent = new WeakMap(), _MetaMetrics_reset = new WeakMap(), _MetaMetrics_storeMetricsOptInPreference = new WeakMap(), _MetaMetrics_getSegmentApiHeaders = new WeakMap(), _MetaMetrics_createDataDeletionTask = new WeakMap(), _MetaMetrics_checkDataDeletionTaskStatus = new WeakMap();
exports["default"] = MetaMetrics;
