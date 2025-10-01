import { CaipChainId, Json, SnapId } from '@metamask/snaps-sdk';
import { KeyringClient, Sender } from '@metamask/keyring-snap-client';
import {
  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  BtcScope,
  ///: END:ONLY_INCLUDE_IF
  EntropySourceId,
  ///: BEGIN:ONLY_INCLUDE_IF(solana)
  SolScope,
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  TrxScope,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/keyring-api';
import { captureException } from '@sentry/react-native';
import {
  TRON_WALLET_SNAP_ID,
  TRON_WALLET_NAME,
  TronWalletSnapSender,
} from './TronWalletSnap';
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
import { SnapKeyring } from '@metamask/eth-snap-keyring';
import { store } from '../../store';
import { startPerformanceTrace } from '../redux/slices/performance';
import { PerformanceEventNames } from '../redux/slices/performance/constants';
import { getMultichainAccountName } from './utils/getMultichainAccountName';
import { endTrace, trace, TraceName, TraceOperation } from '../../util/trace';
import { getTraceTags } from '../../util/sentry/tags';
import {
  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  BITCOIN_DISCOVERY_PENDING,
  ///: END:ONLY_INCLUDE_IF

  ///: BEGIN:ONLY_INCLUDE_IF(solana)
  SOLANA_DISCOVERY_PENDING,
  ///: END:ONLY_INCLUDE_IF

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  TRON_DISCOVERY_PENDING,
  ///: END:ONLY_INCLUDE_IF
} from '../../constants/storage';

export enum WalletClientType {
  ///: BEGIN:ONLY_INCLUDE_IF(solana)
  Solana = 'solana',
  ///: END:ONLY_INCLUDE_IF

  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  Bitcoin = 'bitcoin',
  ///: END:ONLY_INCLUDE_IF

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  Tron = 'tron',
  ///: END:ONLY_INCLUDE_IF
}

export const WALLET_SNAP_MAP = {
  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  [WalletClientType.Bitcoin]: {
    id: BITCOIN_WALLET_SNAP_ID,
    name: BITCOIN_WALLET_NAME,
    discoveryScope: BtcScope.Mainnet,
    discoveryStorageId: BITCOIN_DISCOVERY_PENDING,
  },
  ///: END:ONLY_INCLUDE_IF

  ///: BEGIN:ONLY_INCLUDE_IF(solana)
  [WalletClientType.Solana]: {
    id: SOLANA_WALLET_SNAP_ID,
    name: SOLANA_WALLET_NAME,
    discoveryScope: SolScope.Mainnet,
    discoveryStorageId: SOLANA_DISCOVERY_PENDING,
  },
  ///: END:ONLY_INCLUDE_IF

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  [WalletClientType.Tron]: {
    id: TRON_WALLET_SNAP_ID,
    name: TRON_WALLET_NAME,
    discoveryScope: TrxScope.Mainnet,
    discoveryStorageId: TRON_DISCOVERY_PENDING,
  },
  ///: END:ONLY_INCLUDE_IF
};

export interface MultichainWalletSnapOptions {
  scope?: CaipChainId;
  synchronize?: boolean;
  entropySource?: string;
  accountNameSuggestion?: string;
  derivationPath?: string;
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

  abstract getClientType(): WalletClientType;
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
    callback: (keyring: SnapKeyring) => Promise<unknown>,
  ) {
    const snapKeyring = (await Engine.getSnapKeyring()) as SnapKeyring;

    return await callback(snapKeyring);
  }

  /**
   * Starts sentry tracing.
   *
   * @param name Trace name.
   * @param op Trace operation.
   */
  private startTrace(name: TraceName, op: TraceOperation) {
    trace({
      name,
      op,
      tags: {
        'snap.id': this.snapId,
        ...getTraceTags(store.getState()),
      },
    });
  }

  /**
   * Ends sentry tracing.
   *
   * @param name Trace name.
   */
  private endTrace(name: TraceName) {
    endTrace({
      name,
    });
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
    // This flow is async and start here, to end in the `SnapKeyring.addAccountFinalize` method.
    store.dispatch(
      startPerformanceTrace({
        eventName: PerformanceEventNames.AddSnapAccount,
      }),
    );

    // Same here.
    this.startTrace(
      TraceName.CreateSnapAccount,
      TraceOperation.CreateSnapAccount,
    );

    const accountName =
      options?.accountNameSuggestion ??
      getMultichainAccountName(options.scope, this.getClientType());

    return await this.withSnapKeyring(
      async (keyring) =>
        await keyring.createAccount(
          this.snapId,
          {
            ...options,
            accountNameSuggestion: accountName,
          } as unknown as Record<string, Json>,
          snapKeyringOptions ?? this.snapKeyringOptions,
        ),
    );
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
   * @param scope - The CAIP-2 chain ID to discover accounts for
   * @returns A Promise that resolves when all accounts have been added
   * @throws Error if account discovery or addition fails
   */
  async addDiscoveredAccounts(
    entropySource: EntropySourceId,
    scope: CaipChainId,
  ) {
    this.startTrace(
      TraceName.SnapDiscoverAccounts,
      TraceOperation.DiscoverAccounts,
    );

    let totalDiscoveredAccounts = 0;

    for (let index = 0; ; index++) {
      const discoveredAccounts = await this.discoverAccounts(
        [scope],
        entropySource,
        index,
      );

      // No accounts discovered
      if (discoveredAccounts.length === 0) {
        // For the first index, create a default account
        if (index === 0) {
          try {
            await this.createAccount(
              {
                scope,
                entropySource,
                synchronize: false,
              },
              {
                displayConfirmation: false,
                displayAccountNameSuggestion: false,
                setSelectedAccount: false,
              },
            );
          } catch (error) {
            captureException(new Error(`Failed to create account ${error}`));
          }
        }
        // Stop discovering accounts when none are found
        break;
      }

      // Process discovered accounts sequentially
      for (const account of discoveredAccounts) {
        try {
          await this.createAccount(
            {
              scope,
              derivationPath: account.derivationPath,
              entropySource,
            },
            {
              displayConfirmation: false,
              displayAccountNameSuggestion: false,
              setSelectedAccount: false,
            },
          );
          totalDiscoveredAccounts += 1;
        } catch (error) {
          captureException(new Error(`Failed to create account ${error}`));
        }
      }
    }

    this.endTrace(TraceName.SnapDiscoverAccounts);

    return totalDiscoveredAccounts;
  }
}

export class TronWalletSnapClient extends MultichainWalletSnapClient {
  constructor(snapKeyringOptions: SnapKeyringOptions) {
    super(TRON_WALLET_SNAP_ID, TRON_WALLET_NAME, snapKeyringOptions);
  }

  getClientType(): WalletClientType {
    return WalletClientType.Tron;
  }

  protected getSnapSender(): Sender {
    return new TronWalletSnapSender();
  }
}
export class BitcoinWalletSnapClient extends MultichainWalletSnapClient {
  constructor(snapKeyringOptions: SnapKeyringOptions) {
    super(BITCOIN_WALLET_SNAP_ID, BITCOIN_WALLET_NAME, snapKeyringOptions);
  }

  getClientType(): WalletClientType {
    return WalletClientType.Bitcoin;
  }

  protected getSnapSender(): Sender {
    return new BitcoinWalletSnapSender();
  }

  async createAccount(
    options: MultichainWalletSnapOptions,
    snapKeyringOptions?: SnapKeyringOptions,
  ) {
    return super.createAccount(options, snapKeyringOptions);
  }
}

export class SolanaWalletSnapClient extends MultichainWalletSnapClient {
  constructor(snapKeyringOptions: SnapKeyringOptions) {
    super(SOLANA_WALLET_SNAP_ID, SOLANA_WALLET_NAME, snapKeyringOptions);
  }

  getClientType(): WalletClientType {
    return WalletClientType.Solana;
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
      case WalletClientType.Tron:
        return new TronWalletSnapClient(snapKeyringOptions);
      default:
        throw new Error(`Unsupported client type: ${clientType}`);
    }
  }
}
