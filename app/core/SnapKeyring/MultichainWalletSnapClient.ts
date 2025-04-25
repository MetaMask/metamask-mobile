import { CaipChainId, Json, SnapId } from '@metamask/snaps-sdk';
import { KeyringClient, Sender } from '@metamask/keyring-snap-client';
import { BtcScope, EntropySourceId, SolScope } from '@metamask/keyring-api';
import {
  BITCOIN_WALLET_SNAP_ID,
  BITCOIN_WALLET_NAME,
  BitcoinWalletSnapSender,
} from './BitcoinWalletSnap';
import {
  SOLANA_WALLET_SNAP_ID,
  SOLANA_WALLET_NAME,
  SolanaWalletSnapSender,
} from './SolanaWalletSnap';
import Engine from '../Engine';
import { KeyringTypes } from '@metamask/keyring-controller';
import { SnapKeyring } from '@metamask/eth-snap-keyring';

export enum WalletClientType {
  Bitcoin = 'bitcoin',
  Solana = 'solana',
}

export const WALLET_SNAP_MAP = {
  [WalletClientType.Bitcoin]: {
    id: BITCOIN_WALLET_SNAP_ID,
    name: BITCOIN_WALLET_NAME,
  },
  [WalletClientType.Solana]: {
    id: SOLANA_WALLET_SNAP_ID,
    name: SOLANA_WALLET_NAME,
  },
};

export interface MultichainWalletSnapOptions {
  scope: CaipChainId;
  ///: BEGIN:ONLY_INCLUDE_IF(multi-srp)
  entropySource?: string;
  accountNameSuggestion?: string;
  ///: END:ONLY_INCLUDE_IF
}

interface SnapKeyringOptions {
  displayConfirmation: boolean;
  displayAccountNameSuggestion: boolean;
  setSelectedAccount: boolean;
}

export abstract class MultichainWalletSnapClient {
  readonly snapId: SnapId;
  readonly snapName: string;
  readonly snapKeyringOptions: SnapKeyringOptions;

  protected constructor(
    snapId: SnapId,
    snapName: string,
    snapKeyringOptions: SnapKeyringOptions,
  ) {
    this.snapId = snapId;
    this.snapName = snapName;
    this.snapKeyringOptions = snapKeyringOptions;
  }

  getSnapId(): SnapId {
    return this.snapId;
  }

  getSnapName(): string {
    return this.snapName;
  }

  abstract getScope(): CaipChainId;
  protected abstract getSnapSender(): Sender;

  /**
   * Executes a callback function with a SnapKeyring instance.
   * This method ensures proper initialization of the SnapKeyring and provides a safe way to interact with it.
   *
   * @param callback - An async function that receives a SnapKeyring instance and performs operations with it
   * @returns A Promise that resolves when the callback execution is complete
   * @throws Error if the SnapKeyring cannot be initialized or if the callback execution fails
   *
   */
  protected async withSnapKeyring(
    callback: (keyring: SnapKeyring) => Promise<void>,
  ) {
    const controllerMessenger = Engine.controllerMessenger;
    await Engine.getSnapKeyring();

    return await controllerMessenger.call(
      'KeyringController:withKeyring',
      { type: KeyringTypes.snap },
      async ({ keyring }) => await callback(keyring as unknown as SnapKeyring),
    );
  }

  /**
   * Creates a new account using the SnapKeyring.
   * This method wraps the account creation process with proper SnapKeyring initialization and error handling.
   *
   * @param options - Configuration options for creating the multichain wallet account
   * @param snapKeyringOptions - Configuration options for the SnapKeyring
   * @returns A Promise that resolves when the account creation is complete
   * @throws Error if the account creation fails or if the SnapKeyring cannot be accessed
   *
   */
  async createAccount(
    options: MultichainWalletSnapOptions,
    snapKeyringOptions?: SnapKeyringOptions,
  ) {
    return await this.withSnapKeyring(async (keyring) => {
      (keyring as unknown as SnapKeyring).createAccount(
        this.snapId,
        options as unknown as Record<string, Json>,
        snapKeyringOptions ?? this.snapKeyringOptions,
      );
    });
  }

  /**
   * Discovers accounts for the specified scopes using the provided entropy source.
   *
   * @param scopes - Array of CAIP-2 chain IDs to discover accounts for
   * @param entropySource - The source of entropy to use for account discovery
   * @param groupIndex - The index of the account group to discover
   * @returns A Promise that resolves with the discovered accounts
   * @throws Error if account discovery fails
   */
  async discoverAccounts(
    scopes: CaipChainId[],
    entropySource: EntropySourceId,
    groupIndex: number,
  ) {
    const keyringApiClient = new KeyringClient(this.getSnapSender());
    const accounts = await keyringApiClient.discoverAccounts(
      scopes,
      entropySource,
      groupIndex,
    );

    return accounts;
  }
  /**
   * Adds discovered accounts to the SnapKeyring.
   * This method discovers accounts for the configured scopes and adds them to the keyring.
   *
   * @param entropySource - The source of entropy to use for account discovery
   * @returns A Promise that resolves when all accounts have been added
   * @throws Error if account discovery or addition fails
   */
  /**
   * Adds discovered accounts to the SnapKeyring.
   * This method discovers accounts for the configured scopes and adds them to the keyring.
   *
   * @param entropySource - The source of entropy to use for account discovery
   * @returns A Promise that resolves when all accounts have been added
   * @throws Error if account discovery or addition fails
   */
  async addDiscoveredAccounts(entropySource: EntropySourceId) {
    for (let index = 0; ; index++) {
      const discoveredAccounts = await this.discoverAccounts(
        [this.getScope()],
        entropySource,
        index,
      );

      // We stop discovering accounts if none got discovered for that index.
      if (discoveredAccounts.length === 0) {
        // default create 1 account
        await this.createAccount(
          {
            scope: this.getScope(),
          },
          {
            displayConfirmation: false,
            displayAccountNameSuggestion: false,
            setSelectedAccount: false,
          },
        );
        break;
      }

      return await this.withSnapKeyring(async (keyring) => {
        await Promise.allSettled(
          discoveredAccounts.map(async (account) => {
            keyring.createAccount(
              this.snapId,
              {
                derivationPath: account.derivationPath,
                entropySource,
              },
              {
                displayConfirmation: false,
                displayAccountNameSuggestion: false,
                setSelectedAccount: false,
              },
            );
          }),
        );
      });
    }
  }
}

export class BitcoinWalletSnapClient extends MultichainWalletSnapClient {
  constructor(snapKeyringOptions: SnapKeyringOptions) {
    super(BITCOIN_WALLET_SNAP_ID, BITCOIN_WALLET_NAME, snapKeyringOptions);
  }

  getScope(): CaipChainId {
    return BtcScope.Mainnet;
  }

  protected getSnapSender(): Sender {
    return new BitcoinWalletSnapSender();
  }
}

export class SolanaWalletSnapClient extends MultichainWalletSnapClient {
  constructor(snapKeyringOptions: SnapKeyringOptions) {
    super(SOLANA_WALLET_SNAP_ID, SOLANA_WALLET_NAME, snapKeyringOptions);
  }

  getScope(): CaipChainId {
    return SolScope.Mainnet;
  }

  protected getSnapSender(): Sender {
    return new SolanaWalletSnapSender();
  }
}

export class MultichainWalletSnapFactory {
  private static defaultOptions: SnapKeyringOptions = {
    displayConfirmation: false,
    displayAccountNameSuggestion: false,
    setSelectedAccount: true,
  };

  static createClient(
    clientType: WalletClientType,
    options: Partial<SnapKeyringOptions> = {},
  ): MultichainWalletSnapClient {
    const snapKeyringOptions = {
      ...this.defaultOptions,
      ...options,
    };

    switch (clientType) {
      case WalletClientType.Bitcoin:
        return new BitcoinWalletSnapClient(snapKeyringOptions);
      case WalletClientType.Solana:
        return new SolanaWalletSnapClient(snapKeyringOptions);
      default:
        throw new Error(`Unsupported client type: ${clientType}`);
    }
  }
}
