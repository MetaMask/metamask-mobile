import { shouldShowSmartTransactionsOptInModal } from './index';
import AsyncStorage from '../../store/async-storage-wrapper';
import { NETWORKS_CHAIN_ID } from '../../constants/network';

jest.mock('../../store/async-storage-wrapper');

describe('shouldShowSmartTransactionOptInModal', () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    (AsyncStorage.getItem as jest.Mock).mockClear();
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
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce('7.16.0') // versionSeen
      .mockResolvedValueOnce('7.16.0'); // currentAppVersion

    const result = await shouldShowSmartTransactionsOptInModal(
      NETWORKS_CHAIN_ID.MAINNET,
      undefined,
    );
    expect(result).toBe(false);
  });

  it('should return false if app version is not correct', async () => {
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce(null) // versionSeen
      .mockResolvedValueOnce('7.15.0'); // currentAppVersion

    const result = await shouldShowSmartTransactionsOptInModal(
      NETWORKS_CHAIN_ID.MAINNET,
      undefined,
    );
    expect(result).toBe(false);
  });

  it('should return true if all conditions are met', async () => {
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce(null) // versionSeen
      .mockResolvedValueOnce('7.16.0'); // currentAppVersion

    const result = await shouldShowSmartTransactionsOptInModal(
      NETWORKS_CHAIN_ID.MAINNET,
      undefined,
    );
    expect(result).toBe(true);
  });
});
