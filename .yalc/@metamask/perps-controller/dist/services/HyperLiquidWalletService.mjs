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
var _HyperLiquidWalletService_instances, _HyperLiquidWalletService_isTestnet, _HyperLiquidWalletService_deps, _HyperLiquidWalletService_messenger, _HyperLiquidWalletService_signTypedMessage;
import { hasProperty, isValidHexAddress, parseCaipAccountId } from "@metamask/utils";
import { getChainId } from "../constants/hyperLiquidConfig.mjs";
import { PERPS_ERROR_CODES } from "../perpsErrorCodes.mjs";
import { getSelectedEvmAccountDetailsFromMessenger, getSelectedEvmAccountFromMessenger } from "../utils/accountUtils.mjs";
// Mirrors KeyringTypes from @metamask/keyring-controller. Inlined to keep this
// service portable between mobile and the core monorepo.
const HARDWARE_KEYRING_TYPES = new Set([
    'Ledger Hardware',
    'Trezor Hardware',
    'OneKey Hardware',
    'Lattice Hardware',
    'QR Hardware Wallet Device',
]);
/**
 * Service for MetaMask wallet integration with HyperLiquid SDK
 * Provides wallet adapter that implements AbstractWindowEthereum interface
 */
export class HyperLiquidWalletService {
    constructor(deps, messenger, options = {}) {
        _HyperLiquidWalletService_instances.add(this);
        _HyperLiquidWalletService_isTestnet.set(this, void 0);
        // Platform dependencies for observability
        _HyperLiquidWalletService_deps.set(this, void 0);
        _HyperLiquidWalletService_messenger.set(this, void 0);
        __classPrivateFieldSet(this, _HyperLiquidWalletService_deps, deps, "f");
        __classPrivateFieldSet(this, _HyperLiquidWalletService_messenger, messenger, "f");
        __classPrivateFieldSet(this, _HyperLiquidWalletService_isTestnet, options.isTestnet ?? false, "f");
    }
    /**
     * Check if the keyring is currently unlocked
     *
     * @returns True if the keyring is unlocked and available for signing.
     */
    isKeyringUnlocked() {
        return __classPrivateFieldGet(this, _HyperLiquidWalletService_messenger, "f").call('KeyringController:getState').isUnlocked;
    }
    /**
     * Check whether the selected EVM account is backed by hardware.
     *
     * @returns True for MetaMask hardware keyrings; false for software accounts.
     */
    isSelectedHardwareWallet() {
        const selectedEvmAccount = getSelectedEvmAccountDetailsFromMessenger(__classPrivateFieldGet(this, _HyperLiquidWalletService_messenger, "f"));
        if (!selectedEvmAccount || !hasProperty(selectedEvmAccount, 'metadata')) {
            return false;
        }
        const metadata = selectedEvmAccount.metadata;
        const keyringType = metadata?.keyring?.type;
        return Boolean(keyringType && HARDWARE_KEYRING_TYPES.has(keyringType));
    }
    /**
     * Create wallet adapter that implements AbstractViemJsonRpcAccount interface
     * Required by @nktkas/hyperliquid SDK for signing transactions
     *
     * @returns The wallet adapter with address, signTypedData, and getChainId methods.
     */
    createWalletAdapter() {
        // Get current EVM account via DI messenger
        const evmAccount = getSelectedEvmAccountFromMessenger(__classPrivateFieldGet(this, _HyperLiquidWalletService_messenger, "f"));
        if (!evmAccount?.address) {
            throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
        }
        const address = evmAccount.address;
        return {
            address,
            signTypedData: async (params) => {
                // Get FRESH account on every sign to handle account switches
                // This prevents race conditions where wallet adapter was created with old account
                const currentEvmAccount = getSelectedEvmAccountFromMessenger(__classPrivateFieldGet(this, _HyperLiquidWalletService_messenger, "f"));
                if (!currentEvmAccount?.address) {
                    throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
                }
                const currentAddress = currentEvmAccount.address;
                // Construct EIP-712 typed data
                const typedData = {
                    domain: params.domain,
                    types: params.types,
                    primaryType: params.primaryType,
                    message: params.message,
                };
                __classPrivateFieldGet(this, _HyperLiquidWalletService_deps, "f").debugLogger.log('HyperLiquidWalletService: Signing typed data', {
                    address: currentAddress,
                    primaryType: params.primaryType,
                    domain: params.domain,
                });
                // Use messenger to sign typed data
                const signature = await __classPrivateFieldGet(this, _HyperLiquidWalletService_instances, "m", _HyperLiquidWalletService_signTypedMessage).call(this, {
                    from: currentAddress,
                    data: typedData,
                });
                return signature;
            },
            getChainId: async () => parseInt(getChainId(__classPrivateFieldGet(this, _HyperLiquidWalletService_isTestnet, "f")), 10),
        };
    }
    /**
     * Get current account ID using messenger
     *
     * @returns The CAIP account ID for the current EVM account.
     */
    async getCurrentAccountId() {
        const evmAccount = getSelectedEvmAccountFromMessenger(__classPrivateFieldGet(this, _HyperLiquidWalletService_messenger, "f"));
        if (!evmAccount?.address) {
            throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
        }
        const chainId = getChainId(__classPrivateFieldGet(this, _HyperLiquidWalletService_isTestnet, "f"));
        const caipAccountId = `eip155:${chainId}:${evmAccount.address}`;
        return caipAccountId;
    }
    /**
     * Get validated user address as Hex from account ID
     *
     * @param accountId - The CAIP account ID to extract the address from.
     * @returns The validated hex address.
     */
    getUserAddress(accountId) {
        const parsed = parseCaipAccountId(accountId);
        const address = parsed.address;
        if (!isValidHexAddress(address)) {
            throw new Error(PERPS_ERROR_CODES.INVALID_ADDRESS_FORMAT);
        }
        return address;
    }
    /**
     * Get user address with default fallback to current account
     *
     * @param accountId - Optional CAIP account ID; defaults to current account if omitted.
     * @returns The validated hex address.
     */
    async getUserAddressWithDefault(accountId) {
        const id = accountId ?? (await this.getCurrentAccountId());
        return this.getUserAddress(id);
    }
    /**
     * Update testnet mode
     *
     * @param isTestnet - Whether to enable testnet mode.
     */
    setTestnetMode(isTestnet) {
        __classPrivateFieldSet(this, _HyperLiquidWalletService_isTestnet, isTestnet, "f");
    }
    /**
     * Check if running on testnet
     *
     * @returns True if the service is in testnet mode.
     */
    isTestnetMode() {
        return __classPrivateFieldGet(this, _HyperLiquidWalletService_isTestnet, "f");
    }
}
_HyperLiquidWalletService_isTestnet = new WeakMap(), _HyperLiquidWalletService_deps = new WeakMap(), _HyperLiquidWalletService_messenger = new WeakMap(), _HyperLiquidWalletService_instances = new WeakSet(), _HyperLiquidWalletService_signTypedMessage = 
/**
 * Sign typed data via DI keyring controller
 *
 * @param msgParams - The typed message parameters including data and sender address.
 * @returns The signature string.
 */
async function _HyperLiquidWalletService_signTypedMessage(msgParams) {
    if (!this.isKeyringUnlocked()) {
        throw new Error(PERPS_ERROR_CODES.KEYRING_LOCKED);
    }
    // Cast needed: PerpsTypedMessageParams uses loose `data: unknown` type
    // while KeyringController uses strict TypedMessageParams / SignTypedDataVersion
    return __classPrivateFieldGet(this, _HyperLiquidWalletService_messenger, "f").call('KeyringController:signTypedMessage', 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    msgParams, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    'V4');
};
//# sourceMappingURL=HyperLiquidWalletService.mjs.map