/**
 * MYXWalletService
 *
 * Service for MetaMask wallet integration with MYX SDK.
 * Provides signer adapter that implements ethers.Signer-like interface
 * required by @myx-trade/sdk.
 *
 * Key differences from HyperLiquidWalletService:
 * - MYX SDK uses ethers.Signer interface (different from HyperLiquid's viem interface)
 * - Different chain IDs (BNB/Arbitrum Sepolia vs Arbitrum One)
 * - USDT vs USDC collateral
 */

import {
  parseCaipAccountId,
  type CaipAccountId,
  type Hex,
  isValidHexAddress,
} from '@metamask/utils';
import { getMYXChainId } from '../constants/myxConfig';
import { PERPS_ERROR_CODES } from '../controllers/perpsErrorCodes';
import type { IPerpsPlatformDependencies } from '../controllers/types';
import type { MYXSignerAdapter } from './MYXClientService';

/**
 * Service for MetaMask wallet integration with MYX SDK
 * Provides signer adapter that implements ethers.Signer interface
 */
export class MYXWalletService {
  private isTestnet: boolean;

  // Platform dependencies for account access and signing
  private readonly deps: IPerpsPlatformDependencies;

  constructor(
    deps: IPerpsPlatformDependencies,
    options: { isTestnet?: boolean } = {},
  ) {
    this.deps = deps;
    this.isTestnet = options.isTestnet ?? false;
  }

  // ============================================================================
  // Signer Adapter Creation
  // ============================================================================

  /**
   * Create signer adapter that implements MYX SDK's expected interface
   * MYX SDK uses ethers.Signer-like interface for signing
   *
   * @returns Signer adapter compatible with MYX SDK
   */
  public createSignerAdapter(): MYXSignerAdapter {
    // Get current EVM account using injected controllers.accounts
    const evmAccount = this.deps.controllers.accounts.getSelectedEvmAccount();

    if (!evmAccount?.address) {
      throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
    }

    return {
      /**
       * Get the current account address
       * Always returns fresh address to handle account switches
       */
      getAddress: async (): Promise<string> => {
        const currentEvmAccount =
          this.deps.controllers.accounts.getSelectedEvmAccount();

        if (!currentEvmAccount?.address) {
          throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
        }

        return currentEvmAccount.address;
      },

      /**
       * Sign a message using personal_sign (EIP-191).
       * MYX SDK authentication requires personal_sign for plain message signing.
       */
      signMessage: async (message: string | Uint8Array): Promise<string> => {
        const currentEvmAccount =
          this.deps.controllers.accounts.getSelectedEvmAccount();

        if (!currentEvmAccount?.address) {
          throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
        }

        const currentAddress = currentEvmAccount.address as Hex;

        // Convert message to hex format for personal_sign
        // personal_sign expects data as hex-encoded string
        let hexMessage: string;
        if (message instanceof Uint8Array) {
          hexMessage = `0x${Buffer.from(message).toString('hex')}`;
        } else {
          hexMessage = `0x${Buffer.from(message, 'utf8').toString('hex')}`;
        }

        this.deps.debugLogger.log('[MYXWalletService] Signing message', {
          address: currentAddress,
          messagePreview:
            message.length > 100
              ? `${String(message).slice(0, 100)}...`
              : String(message),
        });

        // Use signPersonalMessage for plain message signing (personal_sign / EIP-191)
        // This is the correct method - signTypedMessage with V1 expects typed data array, not plain strings
        const signature =
          await this.deps.controllers.keyring.signPersonalMessage({
            from: currentAddress,
            data: hexMessage,
          });

        return signature;
      },

      /**
       * Sign typed data (EIP-712)
       * Used for order placement and other operations
       */
      signTypedData: async (
        domain: Record<string, unknown>,
        types: Record<string, unknown[]>,
        value: Record<string, unknown>,
      ): Promise<string> => {
        const currentEvmAccount =
          this.deps.controllers.accounts.getSelectedEvmAccount();

        if (!currentEvmAccount?.address) {
          throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
        }

        const currentAddress = currentEvmAccount.address as Hex;

        // Construct EIP-712 typed data
        // MYX uses a different format than HyperLiquid
        const typedData = {
          domain,
          types: {
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
              { name: 'chainId', type: 'uint256' },
              { name: 'verifyingContract', type: 'address' },
            ],
            ...types,
          },
          primaryType: Object.keys(types)[0] || 'Message',
          message: value,
        };

        this.deps.debugLogger.log('[MYXWalletService] Signing typed data', {
          address: currentAddress,
          domain,
          primaryType: typedData.primaryType,
        });

        // Use injected controllers.keyring to sign
        const signature = await this.deps.controllers.keyring.signTypedMessage(
          {
            from: currentAddress,
            data: typedData,
          },
          'V4',
        );

        return signature;
      },
    };
  }

  // ============================================================================
  // Account Management
  // ============================================================================

  /**
   * Get current account ID in CAIP-10 format
   */
  public async getCurrentAccountId(): Promise<CaipAccountId> {
    const evmAccount = this.deps.controllers.accounts.getSelectedEvmAccount();

    if (!evmAccount?.address) {
      throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
    }

    const chainId = getMYXChainId(this.isTestnet);
    const caipAccountId: CaipAccountId = `eip155:${chainId}:${evmAccount.address}`;

    return caipAccountId;
  }

  /**
   * Get validated user address as Hex from account ID
   */
  public getUserAddress(accountId: CaipAccountId): Hex {
    const parsed = parseCaipAccountId(accountId);
    const address = parsed.address as Hex;

    if (!isValidHexAddress(address)) {
      throw new Error(PERPS_ERROR_CODES.INVALID_ADDRESS_FORMAT);
    }

    return address;
  }

  /**
   * Get user address with default fallback to current account
   */
  public async getUserAddressWithDefault(
    accountId?: CaipAccountId,
  ): Promise<Hex> {
    const id = accountId || (await this.getCurrentAccountId());
    return this.getUserAddress(id);
  }

  /**
   * Get current user address directly (without CAIP formatting)
   */
  public getCurrentUserAddress(): Hex {
    const evmAccount = this.deps.controllers.accounts.getSelectedEvmAccount();

    if (!evmAccount?.address) {
      throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
    }

    return evmAccount.address as Hex;
  }

  // ============================================================================
  // Network Management
  // ============================================================================

  /**
   * Update testnet mode
   */
  public setTestnetMode(isTestnet: boolean): void {
    this.isTestnet = isTestnet;
  }

  /**
   * Check if running on testnet
   */
  public isTestnetMode(): boolean {
    return this.isTestnet;
  }

  /**
   * Get current chain ID
   */
  public getChainId(): number {
    return parseInt(getMYXChainId(this.isTestnet), 10);
  }
}
