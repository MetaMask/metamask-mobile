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
  private pendingKeyring: AccountDiscoverySRP = {};
  private discoveryRunning = false;

  private discover = async (
    keyringId: string,
    clientType: WalletClientType,
  ) => {
    const client = MultichainWalletSnapFactory.createClient(clientType, {
      setSelectedAccount: false,
    });
    const { discoveryScope } = WALLET_SNAP_MAP[clientType];
    await client.addDiscoveredAccounts(keyringId, discoveryScope);
  };

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

        for (const keyringId in this.pendingKeyring) {
          if (this.pendingKeyring[keyringId][walletType]) {
            await client.addDiscoveredAccounts(keyringId, discoveryScope);
            this.pendingKeyring[keyringId][walletType] = false;
            await StorageWrapper.setItem(
              PENDING_SRP_DISCOVERY,
              JSON.stringify(this.pendingKeyring),
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
    const srp = await StorageWrapper.getItem(PENDING_SRP_DISCOVERY);
    if (srp) {
      this.pendingKeyring = JSON.parse(srp);
    }
  };

  clearPendingKeyring = (): void => {
    this.pendingKeyring = {};
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
      if (!this.pendingKeyring[keyringId]) {
        this.pendingKeyring[keyringId] = {};
      }
      for (const wtype of clientType) {
        this.pendingKeyring[keyringId][wtype] = true;
      }
    }

    await StorageWrapper.setItem(
      PENDING_SRP_DISCOVERY,
      JSON.stringify(this.pendingKeyring),
    );
  };
}

export const AccountDiscovery = new AccountDiscoveryService();
