import {
  parseCaipAccountId,
  type CaipAccountId,
  type Hex,
  isValidHexAddress,
} from '@metamask/utils';
import { getChainId } from '../constants/hyperLiquidConfig';
import { PERPS_ERROR_CODES } from '../controllers/perpsErrorCodes';
import type { IPerpsPlatformDependencies } from '../controllers/types';

/**
 * Service for MetaMask wallet integration with HyperLiquid SDK
 * Provides wallet adapter that implements AbstractWindowEthereum interface
 */
export class HyperLiquidWalletService {
  private isTestnet: boolean;

  // Platform dependencies for account access and signing
  private readonly deps: IPerpsPlatformDependencies;

  constructor(
    deps: IPerpsPlatformDependencies,
    options: { isTestnet?: boolean } = {},
  ) {
    this.deps = deps;
    this.isTestnet = options.isTestnet || false;
  }

  /**
   * Create wallet adapter that implements AbstractViemJsonRpcAccount interface
   * Required by @nktkas/hyperliquid SDK for signing transactions
   */
  public createWalletAdapter(): {
    address: Hex;
    signTypedData: (params: {
      domain: {
        name: string;
        version: string;
        chainId: number;
        verifyingContract: Hex;
      };
      types: {
        [key: string]: { name: string; type: string }[];
      };
      primaryType: string;
      message: Record<string, unknown>;
    }) => Promise<Hex>;
    getChainId?: () => Promise<number>;
  } {
    // Get current EVM account using the injected controllers.accounts
    const evmAccount = this.deps.controllers.accounts.getSelectedEvmAccount();

    if (!evmAccount?.address) {
      throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
    }

    const address = evmAccount.address as Hex;

    return {
      address,
      signTypedData: async (params: {
        domain: {
          name: string;
          version: string;
          chainId: number;
          verifyingContract: Hex;
        };
        types: {
          [key: string]: { name: string; type: string }[];
        };
        primaryType: string;
        message: Record<string, unknown>;
      }): Promise<Hex> => {
        // Get FRESH account on every sign to handle account switches
        // This prevents race conditions where wallet adapter was created with old account
        const currentEvmAccount =
          this.deps.controllers.accounts.getSelectedEvmAccount();

        if (!currentEvmAccount?.address) {
          throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
        }

        const currentAddress = currentEvmAccount.address as Hex;

        // Construct EIP-712 typed data
        const typedData = {
          domain: params.domain,
          types: params.types,
          primaryType: params.primaryType,
          message: params.message,
        };

        this.deps.debugLogger.log(
          'HyperLiquidWalletService: Signing typed data',
          {
            address: currentAddress,
            primaryType: params.primaryType,
            domain: params.domain,
          },
        );

        // Use injected controllers.keyring to sign
        const signature = await this.deps.controllers.keyring.signTypedMessage(
          {
            from: currentAddress,
            data: typedData,
          },
          'V4',
        );

        return signature as Hex;
      },
      getChainId: async (): Promise<number> =>
        parseInt(getChainId(this.isTestnet), 10),
    };
  }

  /**
   * Get current account ID using the injected controllers.accounts
   */
  public async getCurrentAccountId(): Promise<CaipAccountId> {
    const evmAccount = this.deps.controllers.accounts.getSelectedEvmAccount();

    if (!evmAccount?.address) {
      throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
    }

    const chainId = getChainId(this.isTestnet);
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
}
