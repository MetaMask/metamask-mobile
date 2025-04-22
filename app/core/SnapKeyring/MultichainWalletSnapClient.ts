import { CaipChainId, Json, SnapId } from '@metamask/snaps-sdk';
import { KeyringClient, Sender } from '@metamask/keyring-snap-client';
import {
  BtcScope,
  EntropySourceId,
  KeyringAccount,
  SolScope,
} from '@metamask/keyring-api';
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
import Logger from '../../util/Logger';

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
  protected readonly snapId: SnapId;
  protected readonly snapName: string;
  protected readonly snapKeyringOptions: SnapKeyringOptions;

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

  protected abstract getScope(): CaipChainId;
  protected abstract getSnapSender(): Sender;

  protected async withSnapKeyring(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: (keyring: SnapKeyring) => Promise<any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const controllerMessenger = Engine.controllerMessenger;
    await Engine.getSnapKeyring();

    return await controllerMessenger.call(
      'KeyringController:withKeyring',
      { type: KeyringTypes.snap },
      async ({ keyring }) => await callback(keyring as unknown as SnapKeyring),
    );
  }

  async createAccount(
    options: MultichainWalletSnapOptions,
    snapKeyringOptions?: SnapKeyringOptions,
  ): Promise<KeyringAccount> {
    return await this.withSnapKeyring(async (keyring) => {
      keyring.createAccount(
        this.snapId,
        options as unknown as Record<string, Json>,
        snapKeyringOptions ?? this.snapKeyringOptions,
      );
    });
  }

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

  protected getScope(): CaipChainId {
    return BtcScope.Mainnet;
  }

  protected getSnapSender(): Sender {
    return new BitcoinWalletSnapSender();
  }

  protected getMainnetScope(): CaipChainId {
    return BtcScope.Mainnet;
  }
}

export class SolanaWalletSnapClient extends MultichainWalletSnapClient {
  constructor(snapKeyringOptions: SnapKeyringOptions) {
    super(SOLANA_WALLET_SNAP_ID, SOLANA_WALLET_NAME, snapKeyringOptions);
  }

  protected getScope(): CaipChainId {
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
