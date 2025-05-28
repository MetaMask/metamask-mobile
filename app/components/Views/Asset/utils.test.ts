import '../../UI/Bridge/_mocks_/initialState';
import { deepClone } from '@metamask/snaps-utils';
import { getSwapsIsLive, getIsSwapsAssetAllowed } from './utils';
import { RootState } from '../../../reducers';
import { SolScope } from '@metamask/keyring-api';
import { isPortfolioViewEnabled } from '../../../util/networks';

jest.mock('../../../util/networks', () => ({
  ...jest.requireActual('../../../util/networks'),
  isPortfolioViewEnabled: jest.fn().mockReturnValue(true),
}));

describe('getSwapsIsLive', () => {
  const mockState = {
    swaps: {
      isLive: true,
      '0x1': { isLive: true },
    },
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            bridgeConfig: {
              minimumVersion: '0.0.0',
              support: true,
              chains: {
                1: {
                  isActiveDest: true,
                  isActiveSrc: true,
                },
                1151111081099710: {
                  isActiveDest: true,
                  isActiveSrc: true,
                  refreshRate: 10000,
                  topAssets: [
                    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
                    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
                    '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxsDx8F8k8k3uYw1PDC',
                    '3iQL8BFS2vE7mww4ehAqQHAsbmRNCrPxizWAT2Zfyr9y',
                    '9zNQRsGLjNKwCUU5Gq5LR8beUCPzQMVMqKAi3SSZh54u',
                    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
                    'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',
                    '21AErpiB8uSb94oQKRcwuHqyHF93njAxBSbdUrpupump',
                  ],
                },
              },
              maxRefreshCount: 5,
              refreshRate: 30000,
            },
            bridgeConfigV2: {
              minimumVersion: '0.0.0',
              support: true,
              chains: {
                1: {
                  isActiveDest: true,
                  isActiveSrc: true,
                },
                1151111081099710: {
                  isActiveDest: true,
                  isActiveSrc: true,
                  refreshRate: 10000,
                  topAssets: [
                    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
                    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
                    '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxsDx8F8k8k3uYw1PDC',
                    '3iQL8BFS2vE7mww4ehAqQHAsbmRNCrPxizWAT2Zfyr9y',
                    '9zNQRsGLjNKwCUU5Gq5LR8beUCPzQMVMqKAi3SSZh54u',
                    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
                    'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',
                    '21AErpiB8uSb94oQKRcwuHqyHF93njAxBSbdUrpupump',
                  ],
                },
              },
              maxRefreshCount: 5,
              refreshRate: 30000,
            },
          },
        },
      },
    },
  } as unknown as RootState;
  const mockChainId = '0x1';
  describe('EVM', () => {
    it('should return true for EVM chain when swaps is live', () => {
      const result = getSwapsIsLive(mockState, mockChainId);
      expect(result).toBe(true);
    });

    it('should return false for EVM chain when swaps is not live', () => {
      const result = getSwapsIsLive(
        {
          ...mockState,
          swaps: { ...mockState.swaps, '0x1': { isLive: false } },
        },
        mockChainId,
      );
      expect(result).toBe(false);
    });

    it('should return false for EVM chain when swaps state is null', () => {
      const result = getSwapsIsLive(
        {
          ...mockState,
          swaps: { ...mockState.swaps, '0x1': null },
        },
        mockChainId,
      );
      expect(result).toBe(false);
    });

    it('should return the correct value for EVM chain when portfolio view is disabled', () => {
      (isPortfolioViewEnabled as jest.Mock).mockReturnValue(false);
      const result = getSwapsIsLive(mockState, mockChainId);
      expect(result).toBe(true);
    });
  });

  describe('Solana', () => {
    it('should return true for Solana chain when bridge is enabled', () => {
      const result = getSwapsIsLive(mockState, SolScope.Mainnet);
      expect(result).toBe(true);
    });

    it('should return false for Solana chain when bridge is not enabled', () => {
      const newState = deepClone(mockState);
      const remoteFeatureFlags =
        newState.engine.backgroundState.RemoteFeatureFlagController
          .remoteFeatureFlags;
      // @ts-expect-error - It's defined in the mock
      remoteFeatureFlags.bridgeConfig.chains[1151111081099710] = {
        minimumVersion: '0.0.0',
        isActiveDest: false,
        isActiveSrc: false,
        refreshRate: 10000,
        topAssets: [],
      };
      // @ts-expect-error - It's defined in the mock
      remoteFeatureFlags.bridgeConfigV2.chains[1151111081099710] = {
        minimumVersion: '0.0.0',
        isActiveDest: false,
        isActiveSrc: false,
        refreshRate: 10000,
        topAssets: [],
      };
      const result = getSwapsIsLive(newState, SolScope.Mainnet);
      expect(result).toBe(false);
    });
  });

  it('should handle portfolio view enabled case', () => {
    const result = getSwapsIsLive(mockState, mockChainId);
    expect(result).toBe(true);
  });

  it('should handle portfolio view disabled case', () => {
    const result = getSwapsIsLive(mockState, mockChainId);
    expect(result).toBe(true);
  });
});

describe('getIsSwapsAssetAllowed', () => {
  const mockSwapsTokens = {
    '0xtoken1': { symbol: 'TOKEN1' },
    '0xtoken2': { symbol: 'TOKEN2' },
  };

  const mockSearchDiscoverySwapsTokens = ['0xtoken3', '0xtoken4'];

  describe('EVM assets', () => {
    it('should return true for ETH assets', () => {
      const result = getIsSwapsAssetAllowed({
        asset: {
          isETH: true,
          isNative: false,
          address: '0x0',
          chainId: '0x1',
        },
        searchDiscoverySwapsTokens: mockSearchDiscoverySwapsTokens,
        swapsTokens: mockSwapsTokens,
      });
      expect(result).toBe(true);
    });

    it('should return true for native assets', () => {
      const result = getIsSwapsAssetAllowed({
        asset: {
          isETH: false,
          isNative: true,
          address: '0x0',
          chainId: '0x1',
        },
        searchDiscoverySwapsTokens: mockSearchDiscoverySwapsTokens,
        swapsTokens: mockSwapsTokens,
      });
      expect(result).toBe(true);
    });

    it('should return true for tokens from search discovery', () => {
      const result = getIsSwapsAssetAllowed({
        asset: {
          isETH: false,
          isNative: false,
          address: '0xtoken3',
          chainId: '0x1',
          isFromSearch: true,
        },
        searchDiscoverySwapsTokens: mockSearchDiscoverySwapsTokens,
        swapsTokens: mockSwapsTokens,
      });
      expect(result).toBe(true);
    });

    it('should return true for tokens in swaps tokens list', () => {
      const result = getIsSwapsAssetAllowed({
        asset: {
          isETH: false,
          isNative: false,
          address: '0xtoken1',
          chainId: '0x1',
        },
        searchDiscoverySwapsTokens: mockSearchDiscoverySwapsTokens,
        swapsTokens: mockSwapsTokens,
      });
      expect(result).toBe(true);
    });

    it('should return false for tokens not in either list', () => {
      const result = getIsSwapsAssetAllowed({
        asset: {
          isETH: false,
          isNative: false,
          address: '0xunknown',
          chainId: '0x1',
        },
        searchDiscoverySwapsTokens: mockSearchDiscoverySwapsTokens,
        swapsTokens: mockSwapsTokens,
      });
      expect(result).toBe(false);
    });

    it('should handle case-insensitive address matching', () => {
      const result = getIsSwapsAssetAllowed({
        asset: {
          isETH: false,
          isNative: false,
          address: '0XTOKEN1',
          chainId: '0x1',
        },
        searchDiscoverySwapsTokens: mockSearchDiscoverySwapsTokens,
        swapsTokens: mockSwapsTokens,
      });
      expect(result).toBe(true);
    });
  });

  describe('Solana assets', () => {
    it('should return true for Solana assets', () => {
      const result = getIsSwapsAssetAllowed({
        asset: {
          isETH: false,
          isNative: false,
          address: 'any-address',
          chainId: SolScope.Mainnet,
        },
        searchDiscoverySwapsTokens: mockSearchDiscoverySwapsTokens,
        swapsTokens: mockSwapsTokens,
      });
      expect(result).toBe(true);
    });
  });
});
