/**
 * MYXWalletService
 *
 * Provides SignerLike and WalletClientLike adapters for the MYX SDK.
 * Routes signing operations through MetaMask's KeyringController via messenger.
 *
 * The MYX SDK (1.0.2+) accepts:
 * - SignerLike (ethers v5/v6 Signer, ISigner, or WalletClientLike) for auth
 * - WalletClientLike for on-chain transactions via transport
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
  MYX_TESTNET_CHAIN_ID,
  MYX_MAINNET_CHAIN_ID,
} from '../constants/myxConfig';
import type { PerpsControllerMessenger } from '../PerpsController';
import { PERPS_ERROR_CODES } from '../perpsErrorCodes';
import type { PerpsPlatformDependencies } from '../types';
import type { MYXNetwork } from '../types/myx-types';
import { getSelectedEvmAccount } from '../utils/accountUtils';

/**
 * Public JSON-RPC endpoints per MYX network, matching the SDK's internal CHAIN_INFO.
 */
const MYX_RPC_URLS: Record<MYXNetwork, string> = {
  mainnet: 'https://bsc-dataseed.bnbchain.org',
  testnet: 'https://rpc.sepolia.linea.build',
};

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
   * Create a SignerLike adapter for the MYX SDK.
   * Returns a plain object matching the MinimalSignerLike shape
   * (getAddress + signTypedData) that the SDK normalizes internally.
   *
   * @returns Signer-like adapter object for the MYX SDK.
   */
  public createEthersSigner(): {
    getAddress: () => string;
    signTypedData: (
      domain: Record<string, unknown>,
      types: Record<string, { name: string; type: string }[]>,
      value: Record<string, unknown>,
    ) => Promise<string>;
    provider: null;
  } {
    const evmAccount = getSelectedEvmAccount(
      this.#messenger.call(
        'AccountTreeController:getAccountsFromSelectedAccountGroup',
      ),
    );
    if (!evmAccount?.address) {
      throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
    }

    return {
      // Synchronous: the MYX SDK calls signer.getAddress() without await
      // (see getUserTradingFeeRate in SDK), so this must return a string, not a Promise.
      getAddress: (): string => {
        const currentAccount = getSelectedEvmAccount(
          this.#messenger.call(
            'AccountTreeController:getAccountsFromSelectedAccountGroup',
          ),
        );
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
        const currentAccount = getSelectedEvmAccount(
          this.#messenger.call(
            'AccountTreeController:getAccountsFromSelectedAccountGroup',
          ),
        );
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
   *
   * The SDK uses `walletClient.transport` to create an ethers BrowserProvider,
   * which it then uses for contract calls (gas estimation, sending transactions).
   * The transport must implement EIP-1193 `request()` to proxy JSON-RPC calls
   * to the chain RPC, with `eth_sendTransaction` routed through MetaMask's
   * TransactionController.
   *
   * @returns WalletClient-like adapter object for the MYX SDK.
   */
  public createWalletClient(): {
    account: { address: string };
    chain: { id: number };
    transport: {
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
    };
    signTypedData: (args: {
      domain: Record<string, unknown>;
      types: Record<string, { name: string; type: string }[]>;
      primaryType: string;
      message: Record<string, unknown>;
    }) => Promise<string>;
  } {
    const evmAccount = getSelectedEvmAccount(
      this.#messenger.call(
        'AccountTreeController:getAccountsFromSelectedAccountGroup',
      ),
    );
    if (!evmAccount?.address) {
      throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
    }
    const network: MYXNetwork = this.#isTestnet ? 'testnet' : 'mainnet';
    const chainId = getMYXChainId(network);
    const rpcUrl = MYX_RPC_URLS[network];

    // EIP-1193 transport that proxies JSON-RPC to the chain's public endpoint.
    // eth_sendTransaction is routed through MetaMask's TransactionController.
    // eth_accounts returns the current user's address.
    const transport = {
      request: async (args: {
        method: string;
        params?: unknown[];
      }): Promise<unknown> => {
        if (args.method === 'eth_accounts') {
          const currentAccount = getSelectedEvmAccount(
            this.#messenger.call(
              'AccountTreeController:getAccountsFromSelectedAccountGroup',
            ),
          );
          return [currentAccount?.address ?? evmAccount.address];
        }

        if (args.method === 'eth_sendTransaction') {
          const txParams = (args.params?.[0] ?? {}) as Record<string, string>;
          const hexChainId = `0x${chainId.toString(16)}` as `0x${string}`;
          const networkClientId = this.#messenger.call(
            'NetworkController:findNetworkClientIdByChainId',
            hexChainId,
          );
          if (!networkClientId) {
            throw new Error(
              `No network client for chain ${hexChainId}. Add the BNB network first.`,
            );
          }

          // If SDK didn't provide gas price, fetch it from the node.
          // TransactionController with requireApproval:false skips the
          // approval flow that normally estimates gas pricing.
          let gasPriceFields: Record<string, string> = {};
          if (txParams.gasPrice) {
            gasPriceFields = { gasPrice: txParams.gasPrice };
          } else if (txParams.maxFeePerGas) {
            gasPriceFields = {
              maxFeePerGas: txParams.maxFeePerGas,
              ...(txParams.maxPriorityFeePerGas
                ? { maxPriorityFeePerGas: txParams.maxPriorityFeePerGas }
                : {}),
            };
          } else {
            // Fetch gas price via the same transport abstraction
            const gasPrice = await transport.request({
              method: 'eth_gasPrice',
              params: [],
            });
            if (gasPrice) {
              gasPriceFields = { gasPrice: gasPrice as string };
            }
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await this.#messenger.call(
            'TransactionController:addTransaction',
            {
              from: (txParams.from ?? evmAccount.address) as Hex,
              to: txParams.to as Hex,
              data: txParams.data as Hex,
              value: (txParams.value ?? '0x0') as Hex,
              gas: txParams.gas ?? txParams.gasLimit,
              ...gasPriceFields,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
            {
              networkClientId,
              origin: 'metamask-perps-myx',
              requireApproval: false,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
          );
          const hash = await result.result;
          return hash;
        }

        if (args.method === 'eth_chainId') {
          return `0x${chainId.toString(16)}`;
        }

        // All other RPC calls (eth_call, eth_estimateGas, eth_getBalance, etc.)
        // are proxied to the chain's public JSON-RPC endpoint.
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: args.method,
            params: args.params ?? [],
          }),
        });

        const json = (await response.json()) as {
          result?: unknown;
          error?: { message: string };
        };
        if (json.error) {
          throw new Error(`RPC error: ${json.error.message}`);
        }
        return json.result;
      },
    };

    return {
      account: { address: evmAccount.address },
      chain: { id: chainId },
      transport,
      signTypedData: async (args): Promise<string> => {
        const currentAccount = getSelectedEvmAccount(
          this.#messenger.call(
            'AccountTreeController:getAccountsFromSelectedAccountGroup',
          ),
        );
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
    const evmAccount = getSelectedEvmAccount(
      this.#messenger.call(
        'AccountTreeController:getAccountsFromSelectedAccountGroup',
      ),
    );
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
    const evmAccount = getSelectedEvmAccount(
      this.#messenger.call(
        'AccountTreeController:getAccountsFromSelectedAccountGroup',
      ),
    );
    if (!evmAccount?.address) {
      throw new Error(PERPS_ERROR_CODES.NO_ACCOUNT_SELECTED);
    }
    const chainId = this.#isTestnet
      ? MYX_TESTNET_CHAIN_ID
      : MYX_MAINNET_CHAIN_ID;
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
