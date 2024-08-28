"use strict";
exports.__esModule = true;
exports.store = exports.EVENT_NAME = exports.ONBOARDING_WIZARD_STEP_DESCRIPTION = exports.DataDeleteResponseStatus = exports.DataDeleteStatus = exports.MetaMetricsEvents = exports.MetaMetrics = void 0;
var MetaMetrics_1 = require("./MetaMetrics");
exports.MetaMetrics = MetaMetrics_1["default"];
var MetaMetrics_events_1 = require("./MetaMetrics.events");
exports.MetaMetricsEvents = MetaMetrics_events_1.MetaMetricsEvents;
exports.ONBOARDING_WIZARD_STEP_DESCRIPTION = MetaMetrics_events_1.ONBOARDING_WIZARD_STEP_DESCRIPTION;
exports.EVENT_NAME = MetaMetrics_events_1.EVENT_NAME;
var MetaMetrics_types_1 = require("./MetaMetrics.types");
exports.DataDeleteStatus = MetaMetrics_types_1.DataDeleteStatus;
exports.DataDeleteResponseStatus = MetaMetrics_types_1.DataDeleteResponseStatus;
/**
 * ⚠️️ WARNING ⚠️ WARNING ⚠️ WARNING ⚠️ WARNING ⚠️ WARNING ⚠️
 * this is a temporary export to allow the app/components/UI/Ramp/Views/OrdersList/OrdersList.test.tsx
 * to run. This should be removed once the test/file under test is refactored to not rely on the store.
 * This is totally not related to the Metametrics module and was here far before.
 * And this is completely out of scope of the Segment migration but it's a blocker if tests do not pass.
 * Removing the Analytics.js file and it's export here required to add the store export directly here.
 *
 * This issue is likely due to a circular dependency between the store and the module under test.
 * How it is related to metrics is beyond me.
 * Please help me fix this. You are my only hope 🙏
 *
 * TODO: remove this export once the test/file under test is refactored to not rely on the store.
 * see https://github.com/MetaMask/metamask-mobile/issues/8756
 */
var store_1 = require("../../store");
exports.store = store_1.store;
