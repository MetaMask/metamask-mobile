"use strict";
/**
 * LighterWalletService
 *
 * Derives and manages the Lighter venue key seed and routes the L1
 * (EVM) signatures Lighter requires.
 *
 * Lighter's protocol needs two kinds of signatures:
 * 1. An EIP-191 `personal_sign` over the ChangePubKey plaintext produced by
 *    the WASM signer — this registers the venue key on the account. The
 *    signature is injected into the L2 transaction (`L1Sig`); the raw EVM
 *    private key is never required, so hardware wallets are supported.
 * 2. Venue-key (Schnorr/ECgFp5) signatures over L2 transactions — produced
 *    inside the WASM signer from a seed.
 *
 * The seed is derived deterministically: the user's account signs a fixed
 * domain message (also EIP-191, deterministic per RFC 6979) and the
 * signature is hashed with SHA-256. The same wallet therefore always
 * derives the same venue key — recoverable across devices with no stored
 * key material.
 *
 * Signature routing mirrors MYXWalletService: through
 * `KeyringController:signPersonalMessage` when a messenger is available,
 * or through an injected `LighterPersonalSigner` for headless use.
 */
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
var _LighterWalletService_isTestnet, _LighterWalletService_deps, _LighterWalletService_messenger, _LighterWalletService_personalSigner, _LighterWalletService_l1Address;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LighterWalletService = void 0;
const utils_1 = require("@metamask/utils");
const lighterConfig_js_1 = require("../constants/lighterConfig.cjs");
const perpsErrorCodes_js_1 = require("../perpsErrorCodes.cjs");
const accountUtils_js_1 = require("../utils/accountUtils.cjs");
class LighterWalletService {
    constructor(deps, options = {}) {
        _LighterWalletService_isTestnet.set(this, void 0);
        _LighterWalletService_deps.set(this, void 0);
        _LighterWalletService_messenger.set(this, void 0);
        _LighterWalletService_personalSigner.set(this, void 0);
        _LighterWalletService_l1Address.set(this, void 0);
        __classPrivateFieldSet(this, _LighterWalletService_deps, deps, "f");
        __classPrivateFieldSet(this, _LighterWalletService_messenger, options.messenger, "f");
        __classPrivateFieldSet(this, _LighterWalletService_personalSigner, options.personalSigner, "f");
        __classPrivateFieldSet(this, _LighterWalletService_l1Address, options.l1Address, "f");
        __classPrivateFieldSet(this, _LighterWalletService_isTestnet, options.isTestnet ?? true, "f");
    }
    get network() {
        return __classPrivateFieldGet(this, _LighterWalletService_isTestnet, "f") ? 'testnet' : 'mainnet';
    }
    /**
     * Resolve the L1 address whose account owns the Lighter account.
     *
     * @returns The EVM address.
     */
    getUserAddress() {
        if (__classPrivateFieldGet(this, _LighterWalletService_messenger, "f")) {
            const evmAccount = (0, accountUtils_js_1.getSelectedEvmAccountFromMessenger)(__classPrivateFieldGet(this, _LighterWalletService_messenger, "f"));
            if (!evmAccount?.address) {
                throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
            }
            return evmAccount.address;
        }
        if (__classPrivateFieldGet(this, _LighterWalletService_l1Address, "f")) {
            return __classPrivateFieldGet(this, _LighterWalletService_l1Address, "f");
        }
        throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
    }
    /**
     * Sign an EIP-191 personal message with the user's L1 account.
     *
     * Routes through the keyring when a messenger is present, else the
     * injected headless signer.
     *
     * @param message - Plaintext message to sign.
     * @returns 65-byte signature as 0x-prefixed hex.
     */
    async signPersonalMessage(message) {
        if (__classPrivateFieldGet(this, _LighterWalletService_messenger, "f")) {
            const { isUnlocked } = __classPrivateFieldGet(this, _LighterWalletService_messenger, "f").call('KeyringController:getState');
            if (!isUnlocked) {
                throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.KEYRING_LOCKED);
            }
            const address = this.getUserAddress();
            __classPrivateFieldGet(this, _LighterWalletService_deps, "f").debugLogger.log('LighterWalletService: personal_sign', {
                address,
            });
            // KeyringController:signPersonalMessage expects hex-encoded data.
            const data = (0, utils_1.bytesToHex)(new TextEncoder().encode(message));
            return await __classPrivateFieldGet(this, _LighterWalletService_messenger, "f").call('KeyringController:signPersonalMessage', { from: address, data });
        }
        if (__classPrivateFieldGet(this, _LighterWalletService_personalSigner, "f")) {
            return await __classPrivateFieldGet(this, _LighterWalletService_personalSigner, "f").call(this, message);
        }
        throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
    }
    /**
     * Derive the deterministic venue-key seed for a key slot.
     *
     * seed = sha256(personal_sign(derivation message)) — 32 bytes, hex.
     * The WASM signer requires >= 32 bytes of hex seed.
     *
     * @param apiKeyIndex - API key slot the seed is bound to.
     * @returns Seed as 0x-prefixed 32-byte hex string.
     */
    async deriveKeySeed(apiKeyIndex) {
        const address = this.getUserAddress();
        const message = (0, lighterConfig_js_1.buildLighterKeyDerivationMessage)({
            address,
            chainId: (0, lighterConfig_js_1.getLighterChainId)(this.network),
            apiKeyIndex,
        });
        const signature = await this.signPersonalMessage(message);
        const seedBytes = await (0, utils_1.sha256)((0, utils_1.hexToBytes)(signature));
        return (0, utils_1.bytesToHex)(seedBytes);
    }
    /**
     * Derive the seed without the 0x prefix (the WASM `_createClient`
     * strips one, but plain hex keeps parity with the reference SDK usage).
     *
     * @param apiKeyIndex - API key slot the seed is bound to.
     * @returns Seed as plain hex string.
     */
    async deriveKeySeedPlain(apiKeyIndex) {
        return (0, utils_1.remove0x)((await this.deriveKeySeed(apiKeyIndex)));
    }
    setTestnetMode(isTestnet) {
        __classPrivateFieldSet(this, _LighterWalletService_isTestnet, isTestnet, "f");
    }
    isTestnetMode() {
        return __classPrivateFieldGet(this, _LighterWalletService_isTestnet, "f");
    }
}
exports.LighterWalletService = LighterWalletService;
_LighterWalletService_isTestnet = new WeakMap(), _LighterWalletService_deps = new WeakMap(), _LighterWalletService_messenger = new WeakMap(), _LighterWalletService_personalSigner = new WeakMap(), _LighterWalletService_l1Address = new WeakMap();
//# sourceMappingURL=LighterWalletService.cjs.map