import { CaipChainId, Json, SnapId } from '@metamask/snaps-sdk';
import { KeyringClient, Sender } from '@metamask/keyring-snap-client';
import { EntropySourceId } from '@metamask/keyring-api';
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
import { BtcScope, SolScope } from '@metamask/keyring-api';

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

  protected abstract getScopes(): CaipChainId[];
  protected abstract getSnapSender(): Sender;

  protected async withSnapKeyring(
    callback: (keyring: SnapKeyring) => Promise<void>,
  ) {
    const controllerMessenger = Engine.controllerMessenger;
    await Engine.getSnapKeyring();

    return await controllerMessenger.call(
      'KeyringController:withKeyring',
      { type: KeyringTypes.snap },
      async ({ keyring }) => {
        await callback(keyring as unknown as SnapKeyring);
      },
    );
  }

  async createAccount(options: MultichainWalletSnapOptions) {
    return await this.withSnapKeyring(async (keyring) => {
      (keyring as unknown as SnapKeyring).createAccount(
        this.snapId,
        options as unknown as Record<string, Json>,
        this.snapKeyringOptions,
      );
    });
  }

  async discoverAccounts(
    scopes: CaipChainId[],
    entropySource: EntropySourceId,
    groupIndex: number,
  ) {
    const keyringApiClient = new KeyringClient(this.getSnapSender());

    return await keyringApiClient.discoverAccounts(
      scopes,
      entropySource,
      groupIndex,
    );
  }

  async addDiscoveredAccounts(entropySource: EntropySourceId) {
    const discoveredAccounts = await this.discoverAccounts(
      this.getScopes(),
      entropySource,
      0,
    );

    return await this.withSnapKeyring(async (keyring) => {
      await Promise.allSettled(
        discoveredAccounts.map(async (account) => {
          await (keyring as unknown as SnapKeyring).createAccount(
            this.snapId,
            {
              derivationPath: account.derivationPath,
              entropySource,
            },
            this.snapKeyringOptions,
          );
        }),
      );
    });
  }
}

export class BitcoinWalletSnapClient extends MultichainWalletSnapClient {
  constructor(snapKeyringOptions: SnapKeyringOptions) {
    super(BITCOIN_WALLET_SNAP_ID, BITCOIN_WALLET_NAME, snapKeyringOptions);
  }

  protected getScopes(): CaipChainId[] {
    return [BtcScope.Mainnet, BtcScope.Testnet];
  }

  protected getSnapSender(): Sender {
    return new BitcoinWalletSnapSender();
  }
}

export class SolanaWalletSnapClient extends MultichainWalletSnapClient {
  constructor(snapKeyringOptions: SnapKeyringOptions) {
    super(SOLANA_WALLET_SNAP_ID, SOLANA_WALLET_NAME, snapKeyringOptions);
  }

  protected getScopes(): CaipChainId[] {
    return [SolScope.Mainnet, SolScope.Devnet, SolScope.Testnet];
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
