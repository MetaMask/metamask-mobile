"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvironment = exports.adaptHyperLiquidLedgerUpdateToUserHistoryItem = exports.parseAssetName = exports.calculateHip3AssetId = exports.formatHyperLiquidSize = exports.formatHyperLiquidPrice = exports.buildAssetMapping = exports.adaptAccountStateFromSDK = exports.adaptMarketFromSDK = exports.adaptTriggerOrderTypeFromSDK = exports.adaptTpslLinkageToGrouping = exports.adaptPositionTriggerOrderFromSDK = exports.adaptOrderFromSDK = exports.adaptPositionFromSDK = exports.adaptOrderToSDK = void 0;
/**
 * Barrel re-export for all portable utilities in controllers/utils/
 *
 * Note: hyperLiquidAdapter and orderCalculations both export calculatePositionSize.
 * We use selective exports to avoid the name collision.
 */
__exportStar(require("./accountUtils.cjs"), exports);
__exportStar(require("./errorUtils.cjs"), exports);
// hyperLiquidAdapter: selective export to avoid calculatePositionSize clash with orderCalculations
var hyperLiquidAdapter_js_1 = require("./hyperLiquidAdapter.cjs");
Object.defineProperty(exports, "adaptOrderToSDK", { enumerable: true, get: function () { return hyperLiquidAdapter_js_1.adaptOrderToSDK; } });
Object.defineProperty(exports, "adaptPositionFromSDK", { enumerable: true, get: function () { return hyperLiquidAdapter_js_1.adaptPositionFromSDK; } });
Object.defineProperty(exports, "adaptOrderFromSDK", { enumerable: true, get: function () { return hyperLiquidAdapter_js_1.adaptOrderFromSDK; } });
Object.defineProperty(exports, "adaptPositionTriggerOrderFromSDK", { enumerable: true, get: function () { return hyperLiquidAdapter_js_1.adaptPositionTriggerOrderFromSDK; } });
Object.defineProperty(exports, "adaptTpslLinkageToGrouping", { enumerable: true, get: function () { return hyperLiquidAdapter_js_1.adaptTpslLinkageToGrouping; } });
Object.defineProperty(exports, "adaptTriggerOrderTypeFromSDK", { enumerable: true, get: function () { return hyperLiquidAdapter_js_1.adaptTriggerOrderTypeFromSDK; } });
Object.defineProperty(exports, "adaptMarketFromSDK", { enumerable: true, get: function () { return hyperLiquidAdapter_js_1.adaptMarketFromSDK; } });
Object.defineProperty(exports, "adaptAccountStateFromSDK", { enumerable: true, get: function () { return hyperLiquidAdapter_js_1.adaptAccountStateFromSDK; } });
Object.defineProperty(exports, "buildAssetMapping", { enumerable: true, get: function () { return hyperLiquidAdapter_js_1.buildAssetMapping; } });
Object.defineProperty(exports, "formatHyperLiquidPrice", { enumerable: true, get: function () { return hyperLiquidAdapter_js_1.formatHyperLiquidPrice; } });
Object.defineProperty(exports, "formatHyperLiquidSize", { enumerable: true, get: function () { return hyperLiquidAdapter_js_1.formatHyperLiquidSize; } });
Object.defineProperty(exports, "calculateHip3AssetId", { enumerable: true, get: function () { return hyperLiquidAdapter_js_1.calculateHip3AssetId; } });
Object.defineProperty(exports, "parseAssetName", { enumerable: true, get: function () { return hyperLiquidAdapter_js_1.parseAssetName; } });
Object.defineProperty(exports, "adaptHyperLiquidLedgerUpdateToUserHistoryItem", { enumerable: true, get: function () { return hyperLiquidAdapter_js_1.adaptHyperLiquidLedgerUpdateToUserHistoryItem; } });
__exportStar(require("./hyperLiquidOrderBookProcessor.cjs"), exports);
__exportStar(require("./hyperLiquidValidation.cjs"), exports);
__exportStar(require("./idUtils.cjs"), exports);
__exportStar(require("./marketDataTransform.cjs"), exports);
__exportStar(require("./marketSearch.cjs"), exports);
__exportStar(require("./marketUtils.cjs"), exports);
__exportStar(require("./orderCalculations.cjs"), exports);
__exportStar(require("./orderTypes.cjs"), exports);
__exportStar(require("./perpsDiskPersistence.cjs"), exports);
__exportStar(require("./rewardsUtils.cjs"), exports);
__exportStar(require("./significantFigures.cjs"), exports);
__exportStar(require("./sortMarkets.cjs"), exports);
__exportStar(require("./standaloneInfoClient.cjs"), exports);
__exportStar(require("./stringParseUtils.cjs"), exports);
__exportStar(require("./transferData.cjs"), exports);
__exportStar(require("./wait.cjs"), exports);
// Inline from former utils.ts (getEnvironment was previously at perps/utils.ts root)
const getEnvironment = () => {
    const env = globalThis.process?.env?.NODE_ENV ?? 'production';
    return env === 'production' ? 'PROD' : 'DEV';
};
exports.getEnvironment = getEnvironment;
__exportStar(require("./perpsFormatters.cjs"), exports);
//# sourceMappingURL=index.cjs.map