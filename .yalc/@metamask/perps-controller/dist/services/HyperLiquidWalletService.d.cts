import type { CaipAccountId, Hex } from "@metamask/utils";
import type { PerpsPlatformDependencies } from "../types/index.cjs";
import type { PerpsControllerMessengerBase } from "../types/messenger.cjs";
/**
 * Service for MetaMask wallet integration with HyperLiquid SDK
 * Provides wallet adapter that implements AbstractWindowEthereum interface
 */
export declare class HyperLiquidWalletService {
    #private;
    constructor(deps: PerpsPlatformDependencies, messenger: PerpsControllerMessengerBase, options?: {
        isTestnet?: boolean;
    });
    /**
     * Check if the keyring is currently unlocked
     *
     * @returns True if the keyring is unlocked and available for signing.
     */
    isKeyringUnlocked(): boolean;
    /**
     * Check whether the selected EVM account is backed by hardware.
     *
     * @returns True for MetaMask hardware keyrings; false for software accounts.
     */
    isSelectedHardwareWallet(): boolean;
    /**
     * Create wallet adapter that implements AbstractViemJsonRpcAccount interface
     * Required by @nktkas/hyperliquid SDK for signing transactions
     *
     * @returns The wallet adapter with address, signTypedData, and getChainId methods.
     */
    createWalletAdapter(): {
        address: Hex;
        signTypedData: (params: {
            domain: {
                name: string;
                version: string;
                chainId: number;
                verifyingContract: Hex;
            };
            types: {
                [key: string]: {
                    name: string;
                    type: string;
                }[];
            };
            primaryType: string;
            message: Record<string, unknown>;
        }) => Promise<Hex>;
        getChainId?: () => Promise<number>;
    };
    /**
     * Get current account ID using messenger
     *
     * @returns The CAIP account ID for the current EVM account.
     */
    getCurrentAccountId(): Promise<CaipAccountId>;
    /**
     * Get validated user address as Hex from account ID
     *
     * @param accountId - The CAIP account ID to extract the address from.
     * @returns The validated hex address.
     */
    getUserAddress(accountId: CaipAccountId): Hex;
    /**
     * Get user address with default fallback to current account
     *
     * @param accountId - Optional CAIP account ID; defaults to current account if omitted.
     * @returns The validated hex address.
     */
    getUserAddressWithDefault(accountId?: CaipAccountId): Promise<Hex>;
    /**
     * Update testnet mode
     *
     * @param isTestnet - Whether to enable testnet mode.
     */
    setTestnetMode(isTestnet: boolean): void;
    /**
     * Check if running on testnet
     *
     * @returns True if the service is in testnet mode.
     */
    isTestnetMode(): boolean;
}
//# sourceMappingURL=HyperLiquidWalletService.d.cts.map