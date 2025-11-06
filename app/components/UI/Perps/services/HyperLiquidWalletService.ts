import {
  parseCaipAccountId,
  type CaipAccountId,
  type Hex,
  isValidHexAddress,
} from '@metamask/utils';
import { store } from '../../../../store';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import Engine from '../../../../core/Engine';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import { getChainId } from '../constants/hyperLiquidConfig';
import { strings } from '../../../../../locales/i18n';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';

/**
 * Service for MetaMask wallet integration with HyperLiquid SDK
 * Provides wallet adapter that implements AbstractWindowEthereum interface
 */
export class HyperLiquidWalletService {
  private isTestnet: boolean;

  constructor(options: { isTestnet?: boolean } = {}) {
    this.isTestnet = options.isTestnet || false;
  }

  /**
   * Create wallet adapter that implements AbstractViemJsonRpcAccount interface
   * Required by @nktkas/hyperliquid SDK for signing transactions
   */
  public createWalletAdapter(): {
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
    return {
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
        const selectedEvmAccount = selectSelectedInternalAccountByScope(
          store.getState(),
        )('eip155:1');

        if (!selectedEvmAccount?.address) {
          throw new Error(strings('perps.errors.noAccountSelected'));
        }

        const address = selectedEvmAccount.address;

        // Construct EIP-712 typed data
        const typedData = {
          domain: params.domain,
          types: params.types,
          primaryType: params.primaryType,
          message: params.message,
        };

        DevLogger.log('HyperLiquidWalletService: Signing typed data', {
          address,
          primaryType: params.primaryType,
          domain: params.domain,
        });

        // Use Engine's KeyringController to sign
        const signature =
          await Engine.context.KeyringController.signTypedMessage(
            {
              from: address,
              data: typedData,
            },
            SignTypedDataVersion.V4,
          );

        return signature as Hex;
      },
      getChainId: async (): Promise<number> =>
        parseInt(getChainId(this.isTestnet), 10),
    };
  }

  /**
   * Get current account ID from Redux store
   */
  public async getCurrentAccountId(): Promise<CaipAccountId> {
    const selectedEvmAccount = selectSelectedInternalAccountByScope(
      store.getState(),
    )('eip155:1');

    if (!selectedEvmAccount?.address) {
      throw new Error(strings('perps.errors.noAccountSelected'));
    }

    const chainId = getChainId(this.isTestnet);
    const caipAccountId: CaipAccountId = `eip155:${chainId}:${selectedEvmAccount.address}`;

    return caipAccountId;
  }

  /**
   * Get validated user address as Hex from account ID
   */
  public getUserAddress(accountId: CaipAccountId): Hex {
    const parsed = parseCaipAccountId(accountId);
    const address = parsed.address as Hex;

    if (!isValidHexAddress(address)) {
      throw new Error(
        strings('perps.errors.invalidAddressFormat', { address }),
      );
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
