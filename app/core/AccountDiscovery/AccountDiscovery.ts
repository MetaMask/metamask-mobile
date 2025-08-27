import {
  MultichainWalletSnapFactory,
  WALLET_SNAP_MAP,
  WalletClientType,
} from '../SnapKeyring/MultichainWalletSnapClient';
import StorageWrapper from '../../store/storage-wrapper';
import { PENDING_SRP_DISCOVERY } from '../../constants/storage';

interface AccountDiscoverySRP {
  [keyringId: string]: {
    [walletType: string]: boolean;
  };
}

class AccountDiscoveryService {
  private _pendingKeyring: AccountDiscoverySRP = {};
  private discoveryRunning = false;

  get pendingKeyring() {
    return this._pendingKeyring;
  }

  get isDiscoveryRunning() {
    return this.discoveryRunning;
  }

  attemptAccountDiscovery = async (): Promise<void> => {
    await this.performAccountDiscovery();
  };

  performAccountDiscovery = async (): Promise<void> => {
    // discovery is running
    if (this.discoveryRunning) throw new Error('discovery is running');
    this.discoveryRunning = true;
    try {
      for (const walletType of Object.values(WalletClientType)) {
        const clientType = walletType;
        const client = MultichainWalletSnapFactory.createClient(clientType, {
          setSelectedAccount: false,
        });
        const { discoveryScope } = WALLET_SNAP_MAP[clientType];

        for (const keyringId in this._pendingKeyring) {
          if (this._pendingKeyring[keyringId][walletType]) {
            await client.addDiscoveredAccounts(keyringId, discoveryScope);
            this._pendingKeyring[keyringId][walletType] = false;
            await StorageWrapper.setItem(
              PENDING_SRP_DISCOVERY,
              JSON.stringify(this._pendingKeyring),
            );
          }
        }
      }
    } finally {
      this.discoveryRunning = false;
    }
  };

  constructor() {
    this.init();
  }

  init = async (): Promise<void> => {
    this._pendingKeyring = {};
    const pendingString = await StorageWrapper.getItem(PENDING_SRP_DISCOVERY);
    if (pendingString) {
      const pendingKeyring = JSON.parse(pendingString);
      if (pendingKeyring) {
        this._pendingKeyring = pendingKeyring;
      }
    }

    this.discoveryRunning = false;
  };

  clearPendingKeyring = () => {
    this._pendingKeyring = {};
  };

  /**
   * Add keyringIds to the pending keyring for account discovery
   * @param keyringIds - keyringIds to add for account discovery
   */
  addKeyringForAcccountDiscovery = async (
    keyringIds: string[],
    clientType: WalletClientType[] = Object.values(WalletClientType),
  ): Promise<void> => {
    for (const keyringId of keyringIds) {
      if (!this._pendingKeyring[keyringId]) {
        this._pendingKeyring[keyringId] = {};
      }
      for (const wtype of clientType) {
        this._pendingKeyring[keyringId][wtype] = true;
      }
    }

    await StorageWrapper.setItem(
      PENDING_SRP_DISCOVERY,
      JSON.stringify(this._pendingKeyring),
    );
  };
}

export const AccountDiscovery = new AccountDiscoveryService();
