import {
  parseCaipAccountId,
  type CaipAccountId,
  type Hex,
  isValidHexAddress,
} from '@metamask/utils';
import {
  SignTypedDataVersion,
  type TypedMessageParams,
} from '@metamask/keyring-controller';
import { getChainId } from '../constants/hyperLiquidConfig';
import { PERPS_ERROR_CODES } from '../controllers/perpsErrorCodes';
import type { PerpsPlatformDependencies } from '../controllers/types';
import type { PerpsControllerMessenger } from '../controllers/PerpsController';

/**
 * Service for MetaMask wallet integration with HyperLiquid SDK
 * Provides wallet adapter that implements AbstractWindowEthereum interface
 */
export class HyperLiquidWalletService {
  private isTestnet: boolean;

  // Platform dependencies for observability
  private readonly deps: PerpsPlatformDependencies;

  // Messenger for inter-controller communication
  private readonly messenger: PerpsControllerMessenger;

  constructor(
    deps: PerpsPlatformDependencies,
    messenger: PerpsControllerMessenger,
    options: { isTestnet?: boolean } = {},
  ) {
    this.deps = deps;
    this.messenger = messenger;
    this.isTestnet = options.isTestnet || false;
  }

  /**
   * Get selected EVM account via messenger
   */
  private getSelectedEvmAccount(): { address: string } | undefined {
    const account = this.messenger.call(
      'AccountsController:getSelectedAccount',
    );
    // Filter for EVM accounts (eip155:eoa or eip155:erc4337)
    if (account?.type === 'eip155:eoa' || account?.type === 'eip155:erc4337') {
      return { address: account.address };
    }
    return undefined;
  }

  /**
   * Sign typed data via messenger
   */
  private async signTypedMessage(
    msgParams: TypedMessageParams,
  ): Promise<string> {
    return this.messenger.call(
      'KeyringController:signTypedMessage',
      msgParams,
      SignTypedDataVersion.V4,
    );
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
    // Get current EVM account using messenger
    const evmAccount = this.getSelectedEvmAccount();

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
        const currentEvmAccount = this.getSelectedEvmAccount();

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

        // Use messenger to sign typed data
        const signature = await this.signTypedMessage({
          from: currentAddress,
          data: typedData,
        });

        return signature as Hex;
      },
      getChainId: async (): Promise<number> =>
        parseInt(getChainId(this.isTestnet), 10),
    };
  }

  /**
   * Get current account ID using messenger
   */
  public async getCurrentAccountId(): Promise<CaipAccountId> {
    const evmAccount = this.getSelectedEvmAccount();

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
