import { CaipChainId, SnapId } from '@metamask/snaps-sdk';
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
///: BEGIN:ONLY_INCLUDE_IF(tron)
import {
  TRON_WALLET_SNAP_ID,
  TRON_WALLET_NAME,
  TronWalletSnapSender,
} from './TronWalletSnap';
///: END:ONLY_INCLUDE_IF

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

export abstract class MultichainWalletSnapClient {
  readonly snapId: SnapId;
  readonly snapName: string;

  protected constructor(snapId: SnapId, snapName: string) {
    this.snapId = snapId;
    this.snapName = snapName;
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
}

export class BitcoinWalletSnapClient extends MultichainWalletSnapClient {
  constructor() {
    super(BITCOIN_WALLET_SNAP_ID, BITCOIN_WALLET_NAME);
  }

  getClientType(): WalletClientType {
    return WalletClientType.Bitcoin;
  }

  protected getSnapSender(): Sender {
    return new BitcoinWalletSnapSender();
  }
}

export class SolanaWalletSnapClient extends MultichainWalletSnapClient {
  constructor() {
    super(SOLANA_WALLET_SNAP_ID, SOLANA_WALLET_NAME);
  }

  getClientType(): WalletClientType {
    return WalletClientType.Solana;
  }

  protected getSnapSender(): Sender {
    return new SolanaWalletSnapSender();
  }
}

///: BEGIN:ONLY_INCLUDE_IF(tron)
export class TronWalletSnapClient extends MultichainWalletSnapClient {
  constructor() {
    super(TRON_WALLET_SNAP_ID, TRON_WALLET_NAME);
  }

  getClientType(): WalletClientType {
    return WalletClientType.Tron;
  }

  protected getSnapSender(): Sender {
    return new TronWalletSnapSender();
  }
}
///: END:ONLY_INCLUDE_IF
