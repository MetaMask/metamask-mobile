import { CaipChainId, Json, SnapId } from '@metamask/snaps-sdk';
import {
  BITCOIN_WALLET_SNAP_ID,
  BITCOIN_WALLET_NAME,
} from './BitcoinWalletSnap';
import { SOLANA_WALLET_SNAP_ID, SOLANA_WALLET_NAME } from './SolanaWalletSnap';
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

export class MultichainWalletSnapClient {
  readonly #snapId: SnapId;

  readonly #snapName: string;

  constructor(clientType: WalletClientType) {
    const { id, name } = WALLET_SNAP_MAP[clientType];
    this.#snapId = id;
    this.#snapName = name;
    if (!this.#snapId) {
      throw new Error(`Unsupported client type: ${clientType}`);
    }
  }

  getSnapId(): SnapId {
    return this.#snapId;
  }

  getSnapName(): string {
    return this.#snapName;
  }

  async createAccount(options: MultichainWalletSnapOptions) {
    const controllerMessenger = Engine.controllerMessenger;
    await Engine.getSnapKeyring();

    // This will trigger the Snap account creation flow (+ account renaming)
    const account = await controllerMessenger.call(
      'KeyringController:withKeyring',
      { type: KeyringTypes.snap },
      async ({ keyring }) => {
        (keyring as unknown as SnapKeyring).createAccount(
          this.#snapId,
          options as unknown as Record<string, Json>,
          {
            displayConfirmation: false,
            displayAccountNameSuggestion: false,
            setSelectedAccount: true,
          },
        );
      },
    );

    return account;
  }
}
