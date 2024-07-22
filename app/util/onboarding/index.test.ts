import { shouldShowSmartTransactionsOptInModal } from './index';
import MMKVWrapper from '../../store/mmkv-wrapper';
import { NETWORKS_CHAIN_ID } from '../../constants/network';
import { store } from '../../store';

const getMockState = (optInModalAppVersionSeen: string | null) => ({
  smartTransactions: {
    optInModalAppVersionSeen,
  },
});

jest.mock('../../store/mmkv-wrapper');

jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(() => getMockState(null)),
    dispatch: jest.fn(),
  },
}));

describe('shouldShowSmartTransactionOptInModal', () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    (MMKVWrapper.getItem as jest.Mock).mockClear();
    (store.getState as jest.Mock).mockClear();
  });

  it('returns true if a user has not seen the modal, is on Ethereum mainnet with default RPC URL and has non-zero balance', async () => {
    (MMKVWrapper.getItem as jest.Mock).mockResolvedValueOnce('7.24.0'); // currentAppVersion
    (store.getState as jest.Mock).mockReturnValueOnce(getMockState(null)); // versionSeen

    const result = await shouldShowSmartTransactionsOptInModal(
      NETWORKS_CHAIN_ID.MAINNET,
      undefined,
      false,
    );
    expect(result).toBe(true);
  });

  test.each([
    [NETWORKS_CHAIN_ID.MAINNET, 'http://mainnet-url.example.com'],
    [NETWORKS_CHAIN_ID.ARBITRUM, 'http://arbitrum-url.example.com'],
  ])(
    `returns false if chainId is not ${NETWORKS_CHAIN_ID.MAINNET} or providerConfigRpcUrl is defined`,
    async (chainId, rpcUrl) => {
      const result = await shouldShowSmartTransactionsOptInModal(
        chainId,
        rpcUrl,
        false,
      );
      expect(result).toBe(false);
    },
  );

  it('returns false if user has seen the modal', async () => {
    (MMKVWrapper.getItem as jest.Mock).mockResolvedValueOnce('7.24.0'); // currentAppVersion
    (store.getState as jest.Mock).mockReturnValueOnce(getMockState('7.24.0')); // versionSeen

    const result = await shouldShowSmartTransactionsOptInModal(
      NETWORKS_CHAIN_ID.MAINNET,
      undefined,
      false,
    );
    expect(result).toBe(false);
  });

  it('returns false if app version is not correct', async () => {
    (MMKVWrapper.getItem as jest.Mock).mockResolvedValueOnce('7.0.0'); // currentAppVersion
    (store.getState as jest.Mock).mockReturnValueOnce(getMockState(null)); // versionSeen

    const result = await shouldShowSmartTransactionsOptInModal(
      NETWORKS_CHAIN_ID.MAINNET,
      undefined,
      false,
    );
    expect(result).toBe(false);
  });

  it('returns false if a user has 0 balance on Ethereum Mainnet with default RPC URL', async () => {
    (MMKVWrapper.getItem as jest.Mock).mockResolvedValueOnce('7.24.0'); // currentAppVersion
    (store.getState as jest.Mock).mockReturnValueOnce(getMockState(null)); // versionSeen

    const result = await shouldShowSmartTransactionsOptInModal(
      NETWORKS_CHAIN_ID.MAINNET,
      undefined,
      true,
    );
    expect(result).toBe(false);
  });
});
