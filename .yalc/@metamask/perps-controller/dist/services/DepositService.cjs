"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _DepositService_deps, _DepositService_messenger;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepositService = void 0;
const controller_utils_1 = require("@metamask/controller-utils");
const utils_1 = require("@metamask/utils");
const hyperLiquidConfig_js_1 = require("../constants/hyperLiquidConfig.cjs");
const accountUtils_js_1 = require("../utils/accountUtils.cjs");
const idUtils_js_1 = require("../utils/idUtils.cjs");
const transferData_js_1 = require("../utils/transferData.cjs");
// Temporary to avoid estimation failures due to insufficient balance
const DEPOSIT_GAS_LIMIT = (0, controller_utils_1.toHex)(hyperLiquidConfig_js_1.DEPOSIT_CONFIG.EstimatedGasLimit);
/**
 * DepositService
 *
 * Handles deposit transaction preparation and validation.
 * Stateless service that prepares transaction data for TransactionController.
 * Controller handles TransactionController integration and promise lifecycle.
 *
 * Instance-based service with constructor injection of platform dependencies
 * and messenger for inter-controller communication.
 */
class DepositService {
    /**
     * Create a new DepositService instance
     *
     * @param deps - Platform dependencies for logging, metrics, etc.
     * @param messenger - Controller messenger for cross-controller communication.
     */
    constructor(deps, messenger) {
        _DepositService_deps.set(this, void 0);
        _DepositService_messenger.set(this, void 0);
        __classPrivateFieldSet(this, _DepositService_deps, deps, "f");
        __classPrivateFieldSet(this, _DepositService_messenger, messenger, "f");
    }
    /**
     * Prepare deposit transaction for confirmation
     * Extracts transaction construction logic from controller
     *
     * @param options - Configuration object
     * @param options.provider - Active provider instance
     * @returns Transaction data ready for TransactionController.addTransaction
     */
    async prepareTransaction(options) {
        const { provider } = options;
        __classPrivateFieldGet(this, _DepositService_deps, "f").debugLogger.log('DepositService: Preparing deposit transaction');
        // Generate deposit request ID for tracking
        const currentDepositId = (0, idUtils_js_1.generateDepositId)();
        // Get deposit routes from provider
        const depositRoutes = provider.getDepositRoutes({ isTestnet: false });
        const route = depositRoutes[0];
        const bridgeContractAddress = route.contractAddress;
        // Generate transfer data for ERC-20 token transfer (portable, no mobile imports)
        const transferData = (0, transferData_js_1.generateERC20TransferData)(bridgeContractAddress, '0x0');
        // Get EVM account from selected account, falling back to the selected account group.
        const evmAccount = (0, accountUtils_js_1.getSelectedEvmAccountFromMessenger)(__classPrivateFieldGet(this, _DepositService_messenger, "f"));
        if (!evmAccount) {
            throw new Error('No EVM-compatible account found in selected account group');
        }
        const accountAddress = evmAccount.address;
        // Parse CAIP asset ID to extract chain ID and token address
        const parsedAsset = (0, utils_1.parseCaipAssetId)(route.assetId);
        const assetChainId = (0, controller_utils_1.toHex)(parsedAsset.chainId.split(':')[1]);
        const tokenAddress = parsedAsset.assetReference;
        // Build transaction parameters for TransactionController
        const transaction = {
            from: accountAddress,
            to: tokenAddress,
            value: '0x0',
            data: transferData,
            gas: DEPOSIT_GAS_LIMIT,
        };
        __classPrivateFieldGet(this, _DepositService_deps, "f").debugLogger.log('DepositService: Deposit transaction prepared', {
            depositId: currentDepositId,
            assetChainId,
            from: accountAddress,
            to: tokenAddress,
        });
        return {
            transaction,
            assetChainId,
            currentDepositId,
        };
    }
}
exports.DepositService = DepositService;
_DepositService_deps = new WeakMap(), _DepositService_messenger = new WeakMap();
//# sourceMappingURL=DepositService.cjs.map