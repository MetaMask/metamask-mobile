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
import { bytesToHex, hexToBytes, remove0x, sha256 } from "@metamask/utils";
import { buildLighterKeyDerivationMessage, getLighterChainId } from "../constants/lighterConfig.mjs";
import { PERPS_ERROR_CODES } from "../perpsErrorCodes.mjs";
import { getSelectedEvmAccountFromMessenger } from "../utils/accountUtils.mjs";
export class LighterWalletService {
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
            const evmAccount = getSelectedEvmAccountFromMessenger(__classPrivateFieldGet(this, _LighterWalletService_messenger, "f"));
            if (!evmAccount?.address) {
                throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
            }
            return evmAccount.address;
        }
        if (__classPrivateFieldGet(this, _LighterWalletService_l1Address, "f")) {
            return __classPrivateFieldGet(this, _LighterWalletService_l1Address, "f");
        }
        throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
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
                throw new Error(PERPS_ERROR_CODES.KEYRING_LOCKED);
            }
            const address = this.getUserAddress();
            __classPrivateFieldGet(this, _LighterWalletService_deps, "f").debugLogger.log('LighterWalletService: personal_sign', {
                address,
            });
            // KeyringController:signPersonalMessage expects hex-encoded data.
            const data = bytesToHex(new TextEncoder().encode(message));
            return await __classPrivateFieldGet(this, _LighterWalletService_messenger, "f").call('KeyringController:signPersonalMessage', { from: address, data });
        }
        if (__classPrivateFieldGet(this, _LighterWalletService_personalSigner, "f")) {
            return await __classPrivateFieldGet(this, _LighterWalletService_personalSigner, "f").call(this, message);
        }
        throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
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
        const message = buildLighterKeyDerivationMessage({
            address,
            chainId: getLighterChainId(this.network),
            apiKeyIndex,
        });
        const signature = await this.signPersonalMessage(message);
        const seedBytes = await sha256(hexToBytes(signature));
        return bytesToHex(seedBytes);
    }
    /**
     * Derive the seed without the 0x prefix (the WASM `_createClient`
     * strips one, but plain hex keeps parity with the reference SDK usage).
     *
     * @param apiKeyIndex - API key slot the seed is bound to.
     * @returns Seed as plain hex string.
     */
    async deriveKeySeedPlain(apiKeyIndex) {
        return remove0x((await this.deriveKeySeed(apiKeyIndex)));
    }
    setTestnetMode(isTestnet) {
        __classPrivateFieldSet(this, _LighterWalletService_isTestnet, isTestnet, "f");
    }
    isTestnetMode() {
        return __classPrivateFieldGet(this, _LighterWalletService_isTestnet, "f");
    }
}
_LighterWalletService_isTestnet = new WeakMap(), _LighterWalletService_deps = new WeakMap(), _LighterWalletService_messenger = new WeakMap(), _LighterWalletService_personalSigner = new WeakMap(), _LighterWalletService_l1Address = new WeakMap();
//# sourceMappingURL=LighterWalletService.mjs.map