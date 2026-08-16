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
import type { PerpsControllerMessenger } from "../PerpsController.mjs";
import type { PerpsPlatformDependencies } from "../types/index.mjs";
import type { LighterNetwork, LighterPersonalSigner } from "../types/lighter-types.mjs";
export declare class LighterWalletService {
    #private;
    constructor(deps: PerpsPlatformDependencies, options?: {
        isTestnet?: boolean;
        messenger?: PerpsControllerMessenger;
        personalSigner?: LighterPersonalSigner;
        l1Address?: string;
    });
    get network(): LighterNetwork;
    /**
     * Resolve the L1 address whose account owns the Lighter account.
     *
     * @returns The EVM address.
     */
    getUserAddress(): string;
    /**
     * Sign an EIP-191 personal message with the user's L1 account.
     *
     * Routes through the keyring when a messenger is present, else the
     * injected headless signer.
     *
     * @param message - Plaintext message to sign.
     * @returns 65-byte signature as 0x-prefixed hex.
     */
    signPersonalMessage(message: string): Promise<string>;
    /**
     * Derive the deterministic venue-key seed for a key slot.
     *
     * seed = sha256(personal_sign(derivation message)) — 32 bytes, hex.
     * The WASM signer requires >= 32 bytes of hex seed.
     *
     * @param apiKeyIndex - API key slot the seed is bound to.
     * @returns Seed as 0x-prefixed 32-byte hex string.
     */
    deriveKeySeed(apiKeyIndex: number): Promise<string>;
    /**
     * Derive the seed without the 0x prefix (the WASM `_createClient`
     * strips one, but plain hex keeps parity with the reference SDK usage).
     *
     * @param apiKeyIndex - API key slot the seed is bound to.
     * @returns Seed as plain hex string.
     */
    deriveKeySeedPlain(apiKeyIndex: number): Promise<string>;
    setTestnetMode(isTestnet: boolean): void;
    isTestnetMode(): boolean;
}
//# sourceMappingURL=LighterWalletService.d.mts.map