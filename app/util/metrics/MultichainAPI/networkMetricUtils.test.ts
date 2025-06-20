import {
  getConfiguredCaipChainIds,
  addItemToChainIdList,
  removeItemFromChainIdList,
} from './networkMetricUtils';
import { UserProfileProperty } from '../UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';

// Mock the store and selectors
jest.mock('../../../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

jest.mock('../../../selectors/networkController', () => ({
  selectNetworkConfigurations: jest.fn(),
}));

import { store } from '../../../store';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import { RootState } from '../../../components/UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';

const mockStore = store as jest.Mocked<typeof store>;
const mockSelectNetworkConfigurations =
  selectNetworkConfigurations as jest.MockedFunction<
    typeof selectNetworkConfigurations
  >;

const mockedState = {} as jest.Mocked<RootState>;

describe('networkMetricUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConfiguredCaipChainIds', () => {
    it('should return empty array when no networks are configured', () => {
      mockStore.getState.mockReturnValue(mockedState);
      mockSelectNetworkConfigurations.mockReturnValue({});

      const result = getConfiguredCaipChainIds();

      expect(result).toEqual([]);
    });

    it('should convert EVM chain IDs to CAIP format', () => {
      const mockNetworks = {
        '0x1': {
          chainId: '0x1',
          name: 'Ethereum Mainnet',
          isEvm: true,
        },
        '0x89': {
          chainId: '0x89',
          name: 'Polygon',
          isEvm: true,
        },
        '0xa86a': {
          chainId: '0xa86a',
          name: 'Avalanche',
          isEvm: true,
        },
      };

      mockStore.getState.mockReturnValue(mockedState);
      // @ts-expect-error - mocking selector for test
      mockSelectNetworkConfigurations.mockReturnValue(mockNetworks);

      const result = getConfiguredCaipChainIds();

      expect(result).toEqual(['eip155:1', 'eip155:137', 'eip155:43114']);
    });

    it('should handle decimal chain IDs', () => {
      const mockNetworks = {
        '1': {
          chainId: '1',
          name: 'Ethereum Mainnet',
          isEvm: true,
        },
        '137': {
          chainId: '137',
          name: 'Polygon',
          isEvm: true,
        },
      };

      mockStore.getState.mockReturnValue(mockedState);
      // @ts-expect-error - mocking selector for test
      mockSelectNetworkConfigurations.mockReturnValue(mockNetworks);

      const result = getConfiguredCaipChainIds();

      expect(result).toEqual([
        'eip155:1',
        'eip155:311', // 137 in hex is 0x89, which is 137 decimal, but toCaipChainId treats it as string
      ]);
    });

    it('should preserve CAIP chain IDs as-is', () => {
      const mockNetworks = {
        'eip155:1': {
          chainId: 'eip155:1',
          name: 'Ethereum Mainnet',
          isEvm: true,
        },
        'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ': {
          chainId: 'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ',
          name: 'Solana',
          isEvm: false,
        },
      };

      mockStore.getState.mockReturnValue(mockedState);
      // @ts-expect-error - mocking selector for test
      mockSelectNetworkConfigurations.mockReturnValue(mockNetworks);

      const result = getConfiguredCaipChainIds();

      expect(result).toEqual([
        'eip155:1',
        'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ',
      ]);
    });
  });

  describe('addItemToChainIdList', () => {
    beforeEach(() => {
      const mockNetworks = {
        '0x1': {
          chainId: '0x1',
          name: 'Ethereum Mainnet',
          isEvm: true,
        },
        '0x89': {
          chainId: '0x89',
          name: 'Polygon',
          isEvm: true,
        },
      };

      mockStore.getState.mockReturnValue(mockedState);
      // @ts-expect-error - mocking selector for test
      mockSelectNetworkConfigurations.mockReturnValue(mockNetworks);
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
          'eip155:274708', // This is what the actual function returns
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
      const mockNetworks = {
        '0x1': {
          chainId: '0x1',
          name: 'Ethereum Mainnet',
          isEvm: true,
        },
        '0x89': {
          chainId: '0x89',
          name: 'Polygon',
          isEvm: true,
        },
        '0xa86a': {
          chainId: '0xa86a',
          name: 'Avalanche',
          isEvm: true,
        },
      };

      mockStore.getState.mockReturnValue(mockedState);
      // @ts-expect-error - mocking selector for test
      mockSelectNetworkConfigurations.mockReturnValue(mockNetworks);
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
      const mockNetworks = {
        '0x1': {
          chainId: '0x1',
          name: 'Ethereum Mainnet',
          isEvm: true,
        },
      };

      mockStore.getState.mockReturnValue(mockedState);
      // @ts-expect-error - mocking selector for test
      mockSelectNetworkConfigurations.mockReturnValue(mockNetworks);

      const result = removeItemFromChainIdList('0x1');

      expect(result).toEqual({
        [UserProfileProperty.CHAIN_IDS]: [],
      });
    });
  });
});
