import {
  MultichainWalletSnapFactory,
  WALLET_SNAP_MAP,
  WalletClientType,
} from '../SnapKeyring/MultichainWalletSnapClient';
import StorageWrapper from '../../store/storage-wrapper';

const PENDING_SRP_DISCOVERY = 'pendingSRPDiscovery';

import { isMultichainAccountsState2Enabled } from '../../multichain-accounts/remote-feature-flag';
import { discoverAndCreateAccounts } from '../../multichain-accounts/discovery';
import Engine from '../Engine';

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
      if (isMultichainAccountsState2Enabled()) {
        const getAllEntropySourcesIds =
          Engine.context.KeyringController.state.keyrings.map(
            (keyring) => keyring.metadata.id,
          );

        for (const entropySource of getAllEntropySourcesIds) {
          await discoverAndCreateAccounts(entropySource);
        }
      } else {
        for (const keyringId in this.pendingKeyring) {
          for (const walletType of Object.values(WalletClientType)) {
            if (this.pendingKeyring[keyringId][walletType]) {
              const clientType = walletType;
              const client = MultichainWalletSnapFactory.createClient(
                clientType,
                {
                  setSelectedAccount: false,
                },
              );
              const { discoveryScope } = WALLET_SNAP_MAP[clientType];
              await client.addDiscoveredAccounts(keyringId, discoveryScope);
              this.pendingKeyring[keyringId][walletType] = false;
              await StorageWrapper.setItem(
                PENDING_SRP_DISCOVERY,
                JSON.stringify(this.pendingKeyring),
              );
            }
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
  ): Promise<void> => {
    for (const keyringId of keyringIds) {
      if (!this.pendingKeyring[keyringId]) {
        this.pendingKeyring[keyringId] = {};
      }
      for (const wtype of Object.values(WalletClientType)) {
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
