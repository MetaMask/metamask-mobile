import {
  parseCaipAccountId,
  type CaipAccountId,
  type Hex,
  isValidHexAddress,
} from '@metamask/utils';
import { store } from '../../../../store';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import Engine from '../../../../core/Engine';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import { getChainId } from '../constants/hyperLiquidConfig';
import { strings } from '../../../../../locales/i18n';

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
   * Create wallet adapter that implements AbstractWindowEthereum interface
   * This is required by HyperLiquid SDK for wallet interactions
   */
  public createWalletAdapter(): {
    request: (args: { method: string; params: unknown[] }) => Promise<unknown>;
  } {
    return {
      request: async (args: {
        method: string;
        params: unknown[];
      }): Promise<unknown> => {
        switch (args.method) {
          case 'eth_requestAccounts': {
            const selectedAddress = selectSelectedInternalAccountAddress(
              store.getState(),
            );
            if (!selectedAddress) {
              throw new Error(strings('perps.errors.noAccountSelected'));
            }
            return [selectedAddress];
          }

          case 'eth_signTypedData_v4': {
            const [address, data] = args.params as [string, string | object];
            const selectedAddress = selectSelectedInternalAccountAddress(
              store.getState(),
            );

            // Check if account is selected
            if (!selectedAddress) {
              throw new Error(strings('perps.errors.noAccountSelected'));
            }

            // Verify the signing address matches the selected account
            if (address.toLowerCase() !== selectedAddress.toLowerCase()) {
              throw new Error(strings('perps.errors.noAccountSelected'));
            }

            // Parse the JSON string if needed
            const typedData =
              typeof data === 'string' ? JSON.parse(data) : data;

            // Use Engine's KeyringController directly
            const signature =
              await Engine.context.KeyringController.signTypedMessage(
                {
                  from: address,
                  data: typedData,
                },
                SignTypedDataVersion.V4,
              );

            return signature;
          }

          default:
            throw new Error(
              strings('perps.errors.unsupportedMethod', {
                method: args.method,
              }),
            );
        }
      },
    };
  }

  /**
   * Get current account ID from Redux store
   */
  public async getCurrentAccountId(): Promise<CaipAccountId> {
    const selectedAddress = selectSelectedInternalAccountAddress(
      store.getState(),
    );

    if (!selectedAddress) {
      throw new Error(strings('perps.errors.noAccountSelected'));
    }

    const chainId = getChainId(this.isTestnet);
    const caipAccountId: CaipAccountId = `eip155:${chainId}:${selectedAddress}`;

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
