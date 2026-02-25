/**
 * MYXWalletService
 *
 * Provides ethers v6 Signer and viem WalletClient adapters for the MYX SDK.
 * Routes signing operations through MetaMask's KeyringController via messenger.
 *
 * The MYX SDK requires:
 * - ethers.Signer (v6) for on-chain transaction signing
 * - viem WalletClient for wallet interactions
 * - getAccessToken callback for API auth
 *
 * This service creates lightweight adapter objects that satisfy these interfaces
 * while delegating actual signing to the MetaMask keyring.
 */

import { SignTypedDataVersion } from '@metamask/keyring-controller';
import type { TypedMessageParams } from '@metamask/keyring-controller';
import { parseCaipAccountId, isValidHexAddress } from '@metamask/utils';
import type { CaipAccountId, Hex } from '@metamask/utils';

import {
  getMYXChainId,
  BNB_TESTNET_CHAIN_ID,
  BNB_MAINNET_CHAIN_ID,
} from '../constants/myxConfig';
import type { PerpsControllerMessenger } from '../PerpsController';
import { PERPS_ERROR_CODES } from '../perpsErrorCodes';
import type { PerpsPlatformDependencies } from '../types';
import { getSelectedEvmAccount } from '../utils/accountUtils';

export class MYXWalletService {
  #isTestnet: boolean;

  readonly #deps: PerpsPlatformDependencies;

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
   * Check if the keyring is currently unlocked.
   *
   * @returns True if the keyring is unlocked and available for signing.
   */
  public isKeyringUnlocked(): boolean {
    return this.#messenger.call('KeyringController:getState').isUnlocked;
  }

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
   * Create an ethers v6 Signer-like object for the MYX SDK.
   * The MYX SDK uses ethers v6 internally (bundled in its own node_modules).
   * We return a plain object that satisfies the SDK's usage pattern:
   * - getAddress(): returns the user's address
   * - signTypedData(): delegates to MetaMask keyring
   *
   * @returns Signer-like adapter object for the MYX SDK.
   */
  public createEthersSigner(): {
    getAddress: () => Promise<string>;
    signTypedData: (
      domain: Record<string, unknown>,
      types: Record<string, { name: string; type: string }[]>,
      value: Record<string, unknown>,
    ) => Promise<string>;
    provider: null;
  } {
    const evmAccount = getSelectedEvmAccount(this.#messenger);
    if (!evmAccount?.address) {
      throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
    }

    return {
      getAddress: async (): Promise<string> => {
        const currentAccount = getSelectedEvmAccount(this.#messenger);
        if (!currentAccount?.address) {
          throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
        }
        return currentAccount.address;
      },
      signTypedData: async (
        domain: Record<string, unknown>,
        types: Record<string, { name: string; type: string }[]>,
        value: Record<string, unknown>,
      ): Promise<string> => {
        const currentAccount = getSelectedEvmAccount(this.#messenger);
        if (!currentAccount?.address) {
          throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
        }

        // Determine primaryType from types (exclude EIP712Domain)
        const typeKeys = Object.keys(types).filter((k) => k !== 'EIP712Domain');
        const primaryType = typeKeys[0] ?? 'EIP712Domain';

        this.#deps.debugLogger.log('MYXWalletService: Signing typed data', {
          address: currentAccount.address,
          primaryType,
        });

        const signature = await this.#signTypedMessage({
          from: currentAccount.address as Hex,
          data: {
            domain,
            types,
            primaryType,
            message: value,
          },
        });

        return signature;
      },
      provider: null,
    };
  }

  /**
   * Create a viem WalletClient-like object for the MYX SDK.
   * The SDK's auth() requires a walletClient parameter.
   * We provide a minimal object that satisfies the SDK's usage.
   *
   * @returns WalletClient-like adapter object for the MYX SDK.
   */
  public createWalletClient(): {
    account: { address: string };
    chain: { id: number };
    signTypedData: (args: {
      domain: Record<string, unknown>;
      types: Record<string, { name: string; type: string }[]>;
      primaryType: string;
      message: Record<string, unknown>;
    }) => Promise<string>;
  } {
    const evmAccount = getSelectedEvmAccount(this.#messenger);
    if (!evmAccount?.address) {
      throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
    }
    const chainId = getMYXChainId(this.#isTestnet ? 'testnet' : 'mainnet');

    return {
      account: { address: evmAccount.address },
      chain: { id: chainId },
      signTypedData: async (args): Promise<string> => {
        const currentAccount = getSelectedEvmAccount(this.#messenger);
        if (!currentAccount?.address) {
          throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
        }

        this.#deps.debugLogger.log(
          'MYXWalletService: WalletClient signTypedData',
          {
            address: currentAccount.address,
            primaryType: args.primaryType,
          },
        );

        const signature = await this.#signTypedMessage({
          from: currentAccount.address as Hex,
          data: {
            domain: args.domain,
            types: args.types,
            primaryType: args.primaryType,
            message: args.message,
          },
        });

        return signature;
      },
    };
  }

  public getUserAddress(): Hex {
    const evmAccount = getSelectedEvmAccount(this.#messenger);
    if (!evmAccount?.address) {
      throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
    }
    const address = evmAccount.address as Hex;
    if (!isValidHexAddress(address)) {
      throw new Error(PERPS_ERROR_CODES.INVALID_ADDRESS_FORMAT);
    }
    return address;
  }

  public async getCurrentAccountId(): Promise<CaipAccountId> {
    const evmAccount = getSelectedEvmAccount(this.#messenger);
    if (!evmAccount?.address) {
      throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
    }
    const chainId = this.#isTestnet
      ? BNB_TESTNET_CHAIN_ID
      : BNB_MAINNET_CHAIN_ID;
    const caipAccountId: CaipAccountId = `eip155:${chainId}:${evmAccount.address}`;
    return caipAccountId;
  }

  public getUserAddressFromAccountId(accountId: CaipAccountId): Hex {
    const parsed = parseCaipAccountId(accountId);
    const address = parsed.address as Hex;
    if (!isValidHexAddress(address)) {
      throw new Error(PERPS_ERROR_CODES.INVALID_ADDRESS_FORMAT);
    }
    return address;
  }

  public async getUserAddressWithDefault(
    accountId?: CaipAccountId,
  ): Promise<Hex> {
    const id = accountId ?? (await this.getCurrentAccountId());
    return this.getUserAddressFromAccountId(id);
  }

  public setTestnetMode(isTestnet: boolean): void {
    this.#isTestnet = isTestnet;
  }

  public isTestnetMode(): boolean {
    return this.#isTestnet;
  }
}
