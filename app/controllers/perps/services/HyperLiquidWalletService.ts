import { SignTypedDataVersion } from '@metamask/keyring-controller';
import type { TypedMessageParams } from '@metamask/keyring-controller';
import { parseCaipAccountId, isValidHexAddress } from '@metamask/utils';
import type { CaipAccountId, Hex } from '@metamask/utils';

import { getChainId } from '../constants/hyperLiquidConfig';
import type { PerpsControllerMessenger } from '../PerpsController';
import { PERPS_ERROR_CODES } from '../perpsErrorCodes';
import type { PerpsPlatformDependencies } from '../types';
import { getSelectedEvmAccount } from '../utils/accountUtils';

/**
 * Service for MetaMask wallet integration with HyperLiquid SDK
 * Provides wallet adapter that implements AbstractWindowEthereum interface
 */
export class HyperLiquidWalletService {
  #isTestnet: boolean;

  // Platform dependencies for observability
  readonly #deps: PerpsPlatformDependencies;

  // Messenger for inter-controller communication
  readonly #messenger: PerpsControllerMessenger;

  constructor(
    deps: PerpsPlatformDependencies,
    messenger: PerpsControllerMessenger,
    options: { isTestnet?: boolean } = {},
  ) {
    this.#deps = deps;
    this.#messenger = messenger;
    this.#isTestnet = options.isTestnet ?? false;
  }

  /**
   * Check if the keyring is currently unlocked
   *
   * @returns True if the keyring is unlocked and available for signing.
   */
  public isKeyringUnlocked(): boolean {
    return this.#messenger.call('KeyringController:getState').isUnlocked;
  }

  /**
   * Sign typed data via messenger
   *
   * @param msgParams - The typed message parameters including data and sender address.
   * @returns The signature string.
   */
  async #signTypedMessage(msgParams: TypedMessageParams): Promise<string> {
    if (!this.isKeyringUnlocked()) {
      throw new Error(PERPS_ERROR_CODES.KEYRING_LOCKED);
    }
    return this.#messenger.call(
      'KeyringController:signTypedMessage',
      msgParams,
      SignTypedDataVersion.V4,
    );
  }

  /**
   * Create wallet adapter that implements AbstractViemJsonRpcAccount interface
   * Required by @nktkas/hyperliquid SDK for signing transactions
   *
   * @returns The wallet adapter with address, signTypedData, and getChainId methods.
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
    const evmAccount = getSelectedEvmAccount(this.#messenger);

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
        const currentEvmAccount = getSelectedEvmAccount(this.#messenger);

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

        this.#deps.debugLogger.log(
          'HyperLiquidWalletService: Signing typed data',
          {
            address: currentAddress,
            primaryType: params.primaryType,
            domain: params.domain,
          },
        );

        // Use messenger to sign typed data
        const signature = await this.#signTypedMessage({
          from: currentAddress,
          data: typedData,
        });

        return signature as Hex;
      },
      getChainId: async (): Promise<number> =>
        parseInt(getChainId(this.#isTestnet), 10),
    };
  }

  /**
   * Get current account ID using messenger
   *
   * @returns The CAIP account ID for the current EVM account.
   */
  public async getCurrentAccountId(): Promise<CaipAccountId> {
    const evmAccount = getSelectedEvmAccount(this.#messenger);

    if (!evmAccount?.address) {
      throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
    }

    const chainId = getChainId(this.#isTestnet);
    const caipAccountId: CaipAccountId = `eip155:${chainId}:${evmAccount.address}`;

    return caipAccountId;
  }

  /**
   * Get validated user address as Hex from account ID
   *
   * @param accountId - The CAIP account ID to extract the address from.
   * @returns The validated hex address.
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
   *
   * @param accountId - Optional CAIP account ID; defaults to current account if omitted.
   * @returns The validated hex address.
   */
  public async getUserAddressWithDefault(
    accountId?: CaipAccountId,
  ): Promise<Hex> {
    const id = accountId ?? (await this.getCurrentAccountId());
    return this.getUserAddress(id);
  }

  /**
   * Update testnet mode
   *
   * @param isTestnet - Whether to enable testnet mode.
   */
  public setTestnetMode(isTestnet: boolean): void {
    this.#isTestnet = isTestnet;
  }

  /**
   * Check if running on testnet
   *
   * @returns True if the service is in testnet mode.
   */
  public isTestnetMode(): boolean {
    return this.#isTestnet;
  }
}
