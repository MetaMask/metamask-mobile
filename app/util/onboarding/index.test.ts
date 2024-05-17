import { shouldShowSmartTransactionsOptInModal } from './index';
import AsyncStorage from '../../store/async-storage-wrapper';
import { NETWORKS_CHAIN_ID } from '../../constants/network';
import { store } from '../../store';

const getMockState = (optInModalAppVersionSeen: string | null) => ({
  smartTransactions: {
    optInModalAppVersionSeen,
  },
});

jest.mock('../../store/async-storage-wrapper');

jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(() => getMockState(null)),
    dispatch: jest.fn(),
  },
}));

describe('shouldShowSmartTransactionOptInModal', () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    (AsyncStorage.getItem as jest.Mock).mockClear();
    (store.getState as jest.Mock).mockClear();
  });

  test.each([
    [NETWORKS_CHAIN_ID.MAINNET, 'http://mainnet-url.example.com'],
    [NETWORKS_CHAIN_ID.ARBITRUM, 'http://arbitrum-url.example.com'],
  ])(
    `should return false if chainId not ${NETWORKS_CHAIN_ID.MAINNET} or providerConfigRpcUrl is defined`,
    async (chainId, rpcUrl) => {
      const result = await shouldShowSmartTransactionsOptInModal(
        chainId,
        rpcUrl,
      );
      expect(result).toBe(false);
    },
  );

  it('should return false if user has seen the modal', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('7.24.0'); // currentAppVersion
    (store.getState as jest.Mock).mockReturnValueOnce(getMockState('7.24.0')); // versionSeen

    const result = await shouldShowSmartTransactionsOptInModal(
      NETWORKS_CHAIN_ID.MAINNET,
      undefined,
    );
    expect(result).toBe(false);
  });

  it('should return false if app version is not correct', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('7.0.0'); // currentAppVersion
    (store.getState as jest.Mock).mockReturnValueOnce(getMockState(null)); // versionSeen

    const result = await shouldShowSmartTransactionsOptInModal(
      NETWORKS_CHAIN_ID.MAINNET,
      undefined,
    );
    expect(result).toBe(false);
  });

  it('should return true if has not seen and is on mainnet with default RPC url', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('7.24.0'); // currentAppVersion
    (store.getState as jest.Mock).mockReturnValueOnce(getMockState(null)); // versionSeen

    const result = await shouldShowSmartTransactionsOptInModal(
      NETWORKS_CHAIN_ID.MAINNET,
      undefined,
    );
    expect(result).toBe(true);
  });
});
