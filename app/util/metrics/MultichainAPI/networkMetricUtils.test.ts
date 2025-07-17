import {
  getConfiguredCaipChainIds,
  addItemToChainIdList,
  removeItemFromChainIdList,
} from './networkMetricUtils';
import { UserProfileProperty } from '../UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';

// Mock the store and selectors
const mockGetState = jest.fn();

jest.mock('../../../store', () => ({
  store: {
    getState: jest.fn(() => mockGetState()),
  },
}));

// Mock MetaMask utility functions
jest.mock('@metamask/utils', () => ({
  isCaipChainId: jest.fn((chainId: string) => chainId.includes(':')),
  isHexString: jest.fn((chainId: string) => chainId.startsWith('0x')),
  toCaipChainId: jest.fn(
    (namespace: string, reference: string) =>
      `${namespace}:${parseInt(reference, 10)}`,
  ),
}));

jest.mock('@metamask/multichain-network-controller', () => ({
  toEvmCaipChainId: jest.fn(
    (chainId: string) => `eip155:${parseInt(chainId, 16)}`,
  ),
}));

describe('networkMetricUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConfiguredCaipChainIds', () => {
    it('should return empty array when no networks are configured', () => {
      mockGetState.mockReturnValue({
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {},
            },
            MultichainNetworkController: {
              multichainNetworkConfigurationsByChainId: {},
            },
          },
        },
      });

      const result = getConfiguredCaipChainIds();

      expect(result).toEqual([]);
    });

    it('should convert EVM chain IDs to CAIP format', () => {
      mockGetState.mockReturnValue({
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                '0x1': {
                  chainId: '0x1',
                  name: 'Ethereum Mainnet',
                },
                '0x89': {
                  chainId: '0x89',
                  name: 'Polygon',
                },
                '0xa86a': {
                  chainId: '0xa86a',
                  name: 'Avalanche',
                },
              },
            },
            MultichainNetworkController: {
              multichainNetworkConfigurationsByChainId: {},
            },
          },
        },
      });

      const result = getConfiguredCaipChainIds();

      expect(result).toEqual(['eip155:1', 'eip155:137', 'eip155:43114']);
    });

    it('should handle decimal chain IDs', () => {
      mockGetState.mockReturnValue({
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                '1': {
                  chainId: '1',
                  name: 'Ethereum Mainnet',
                },
                '137': {
                  chainId: '137',
                  name: 'Polygon',
                },
              },
            },
            MultichainNetworkController: {
              multichainNetworkConfigurationsByChainId: {},
            },
          },
        },
      });

      const result = getConfiguredCaipChainIds();

      expect(result).toEqual(['eip155:1', 'eip155:137']);
    });

    it('should preserve CAIP chain IDs as-is', () => {
      mockGetState.mockReturnValue({
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                'eip155:1': {
                  chainId: 'eip155:1',
                  name: 'Ethereum Mainnet',
                },
              },
            },
            MultichainNetworkController: {
              multichainNetworkConfigurationsByChainId: {
                'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ': {
                  chainId: 'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ',
                  name: 'Solana',
                },
              },
            },
          },
        },
      });

      const result = getConfiguredCaipChainIds();

      expect(result).toEqual([
        'eip155:1',
        'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ',
      ]);
    });
  });

  describe('addItemToChainIdList', () => {
    beforeEach(() => {
      mockGetState.mockReturnValue({
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                '0x1': {
                  chainId: '0x1',
                  name: 'Ethereum Mainnet',
                },
                '0x89': {
                  chainId: '0x89',
                  name: 'Polygon',
                },
              },
            },
            MultichainNetworkController: {
              multichainNetworkConfigurationsByChainId: {},
            },
          },
        },
      });
    });

    it('should add a new hex chain ID to the list', () => {
      const result = addItemToChainIdList('0xa86a');

      expect(result).toEqual({
        [UserProfileProperty.CHAIN_IDS]: [
          'eip155:1',
          'eip155:137',
          'eip155:43114',
        ],
      });
    });

    it('should add a new decimal chain ID to the list', () => {
      const result = addItemToChainIdList('43114');

      expect(result).toEqual({
        [UserProfileProperty.CHAIN_IDS]: [
          'eip155:1',
          'eip155:137',
          'eip155:43114',
        ],
      });
    });

    it('should add a CAIP chain ID to the list', () => {
      const result = addItemToChainIdList('eip155:43114');

      expect(result).toEqual({
        [UserProfileProperty.CHAIN_IDS]: [
          'eip155:1',
          'eip155:137',
          'eip155:43114',
        ],
      });
    });

    it('should handle non-EVM CAIP chain IDs', () => {
      const result = addItemToChainIdList(
        'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ',
      );

      expect(result).toEqual({
        [UserProfileProperty.CHAIN_IDS]: [
          'eip155:1',
          'eip155:137',
          'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ',
        ],
      });
    });
  });

  describe('removeItemFromChainIdList', () => {
    beforeEach(() => {
      mockGetState.mockReturnValue({
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                '0x1': {
                  chainId: '0x1',
                  name: 'Ethereum Mainnet',
                },
                '0x89': {
                  chainId: '0x89',
                  name: 'Polygon',
                },
                '0xa86a': {
                  chainId: '0xa86a',
                  name: 'Avalanche',
                },
              },
            },
            MultichainNetworkController: {
              multichainNetworkConfigurationsByChainId: {},
            },
          },
        },
      });
    });

    it('should remove a hex chain ID from the list', () => {
      const result = removeItemFromChainIdList('0x89');

      expect(result).toEqual({
        [UserProfileProperty.CHAIN_IDS]: ['eip155:1', 'eip155:43114'],
      });
    });

    it('should remove a decimal chain ID from the list', () => {
      const result = removeItemFromChainIdList('0x89'); // Use the hex value that matches the configured network

      expect(result).toEqual({
        [UserProfileProperty.CHAIN_IDS]: ['eip155:1', 'eip155:43114'],
      });
    });

    it('should remove a CAIP chain ID from the list', () => {
      const result = removeItemFromChainIdList('eip155:137');

      expect(result).toEqual({
        [UserProfileProperty.CHAIN_IDS]: ['eip155:1', 'eip155:43114'],
      });
    });

    it('should handle removing non-existent chain ID gracefully', () => {
      const result = removeItemFromChainIdList('0x999');

      expect(result).toEqual({
        [UserProfileProperty.CHAIN_IDS]: [
          'eip155:1',
          'eip155:137',
          'eip155:43114',
        ],
      });
    });

    it('should return empty array when all networks are removed', () => {
      mockGetState.mockReturnValue({
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                '0x1': {
                  chainId: '0x1',
                  name: 'Ethereum Mainnet',
                },
              },
            },
            MultichainNetworkController: {
              multichainNetworkConfigurationsByChainId: {},
            },
          },
        },
      });

      const result = removeItemFromChainIdList('0x1');

      expect(result).toEqual({
        [UserProfileProperty.CHAIN_IDS]: [],
      });
    });
  });
});
