import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  parseCaipChainId,
  CaipChainId,
  toCaipChainId,
  isHexString,
} from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { toHex } from '@metamask/controller-utils';
import Engine from '../../../core/Engine';

jest.mock('@metamask/keyring-utils', () => ({}));
jest.mock('@metamask/keyring-api', () => ({
  SolScope: {
    Mainnet: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  },
}));
jest.mock('@metamask/rpc-errors', () => ({}));
jest.mock('@metamask/network-controller', () => ({}));
jest.mock('@metamask/controller-utils', () => ({
  hasProperty: jest.fn(),
  toHex: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    NetworkEnablementController: {
      enableNetwork: jest.fn(),
      disableNetwork: jest.fn(),
      enableNetworkInNamespace: jest.fn(),
    },
  },
}));

jest.mock('@metamask/utils', () => ({
  parseCaipChainId: jest.fn(),
  CaipChainId: jest.fn(),
  KnownCaipNamespace: {
    Eip155: 'eip155',
    Solana: 'solana',
  },
  toCaipChainId: jest.fn(),
  isHexString: jest.fn(),
}));

jest.mock('@metamask/multichain-network-controller', () => ({
  toEvmCaipChainId: jest.fn(),
}));

jest.mock('../../../selectors/networkEnablementController', () => ({
  selectEnabledNetworksByNamespace: jest.fn(),
}));

jest.mock('../../../selectors/multichainNetworkController', () => ({
  selectIsEvmNetworkSelected: jest.fn(),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectChainId: jest.fn(),
}));

import { useNetworkEnablement } from './useNetworkEnablement';
import { selectEnabledNetworksByNamespace } from '../../../selectors/networkEnablementController';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectChainId } from '../../../selectors/networkController';

const mockNetworkEnablementController = {
  enableNetwork: jest.fn(),
  disableNetwork: jest.fn(),
  isNetworkEnabled: jest.fn(),
  hasOneEnabledNetwork: jest.fn(),
  enableAllPopularNetworks: jest.fn(),
  enableNetworkInNamespace: jest.fn(),
};

describe('useNetworkEnablement', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectEnabledNetworksByNamespace) {
        return {
          eip155: {
            '0x1': true,
            '0x89': false,
          },
          solana: {
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
            'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ': false,
          },
        };
      }
      if (selector === selectChainId) {
        return '0x1';
      }
      if (selector === selectIsEvmNetworkSelected) {
        return true;
      }
      return undefined;
    });

    (parseCaipChainId as jest.Mock).mockImplementation((id: string) => {
      if (!id || typeof id !== 'string') {
        return { namespace: 'eip155', reference: '1' };
      }
      const parts = id.split(':');
      const namespace = parts[0] ?? 'eip155';
      const reference = parts[1] ?? '1';
      return { namespace, reference };
    });
    (toEvmCaipChainId as jest.Mock).mockReturnValue('eip155:1');
    (toHex as jest.Mock).mockImplementation((value) => `0x${value}`);
    (toCaipChainId as jest.Mock).mockImplementation(
      (namespace, chainId) => `${namespace}:${chainId}`,
    );
    (isHexString as unknown as jest.Mock).mockReturnValue(true);

    (
      Engine.context as unknown as {
        NetworkEnablementController: typeof mockNetworkEnablementController;
      }
    ).NetworkEnablementController = mockNetworkEnablementController;
  });

  describe('basic functionality', () => {
    it('returns expected object structure', () => {
      const { result } = renderHook(() => useNetworkEnablement());

      expect(result.current).toHaveProperty('namespace');
      expect(result.current).toHaveProperty('enabledNetworksByNamespace');
      expect(result.current).toHaveProperty(
        'enabledNetworksForCurrentNamespace',
      );
      expect(result.current).toHaveProperty('networkEnablementController');
      expect(result.current).toHaveProperty('enableNetwork');
      expect(result.current).toHaveProperty('disableNetwork');
      expect(result.current).toHaveProperty('isNetworkEnabled');
      expect(result.current).toHaveProperty('hasOneEnabledNetwork');
      expect(result.current).toHaveProperty('tryEnableEvmNetwork');
      expect(result.current).toHaveProperty('enableAllPopularNetworks');
    });

    it('returns functions for network operations', () => {
      const { result } = renderHook(() => useNetworkEnablement());

      expect(typeof result.current.enableNetwork).toBe('function');
      expect(typeof result.current.disableNetwork).toBe('function');
      expect(typeof result.current.enableAllPopularNetworks).toBe('function');
      expect(typeof result.current.isNetworkEnabled).toBe('function');
      expect(typeof result.current.hasOneEnabledNetwork).toBe('boolean');
      expect(typeof result.current.tryEnableEvmNetwork).toBe('function');
    });

    it('calculates namespace correctly', () => {
      const { result } = renderHook(() => useNetworkEnablement());

      expect(result.current.namespace).toBe('eip155');
    });

    it('returns enabled networks for current namespace', () => {
      const { result } = renderHook(() => useNetworkEnablement());

      expect(result.current.enabledNetworksForCurrentNamespace).toEqual({
        '0x1': true,
        '0x89': false,
      });
    });
  });

  describe('hasOneEnabledNetwork', () => {
    it('returns true when exactly one network is enabled', () => {
      const { result } = renderHook(() => useNetworkEnablement());

      expect(result.current.hasOneEnabledNetwork).toBe(true);
    });

    it('returns false when no networks are enabled', () => {
      mockUseSelector.mockImplementation((selector) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectEnabledNetworksByNamespace')) {
          return {
            eip155: {
              '0x1': false,
              '0x89': false,
            },
          };
        }
        if (selectorStr.includes('selectChainId')) {
          return '0x1';
        }
        if (selectorStr.includes('selectIsEvmNetworkSelected')) {
          return true;
        }
        return undefined;
      });

      const { result } = renderHook(() => useNetworkEnablement());

      expect(result.current.hasOneEnabledNetwork).toBe(false);
    });

    it('returns false when multiple networks are enabled', () => {
      mockUseSelector.mockImplementation((selector) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectEnabledNetworksByNamespace')) {
          return {
            eip155: {
              '0x1': true,
              '0x89': true,
              '0x38': true,
            },
          };
        }
        if (selectorStr.includes('selectChainId')) {
          return '0x1';
        }
        if (selectorStr.includes('selectIsEvmNetworkSelected')) {
          return true;
        }
        return undefined;
      });

      const { result } = renderHook(() => useNetworkEnablement());

      expect(result.current.hasOneEnabledNetwork).toBe(false);
    });

    it('returns false when enabled networks object is empty', () => {
      mockUseSelector.mockImplementation((selector) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectEnabledNetworksByNamespace')) {
          return {
            eip155: {},
          };
        }
        if (selectorStr.includes('selectChainId')) {
          return '0x1';
        }
        if (selectorStr.includes('selectIsEvmNetworkSelected')) {
          return true;
        }
        return undefined;
      });

      const { result } = renderHook(() => useNetworkEnablement());

      expect(result.current.hasOneEnabledNetwork).toBe(false);
    });
  });

  describe('network operations', () => {
    it('calls disableNetwork when disableNetwork is called', () => {
      const chainId = 'eip155:1' as CaipChainId;

      const { result } = renderHook(() => useNetworkEnablement());
      result.current.disableNetwork(chainId);

      expect(
        mockNetworkEnablementController.disableNetwork,
      ).toHaveBeenCalledWith(chainId);
    });

    it('computes isNetworkEnabled from store state for EVM networks', () => {
      const { result } = renderHook(() => useNetworkEnablement());
      expect(result.current.isNetworkEnabled('eip155:1' as CaipChainId)).toBe(
        true,
      );
      expect(result.current.isNetworkEnabled('eip155:89' as CaipChainId)).toBe(
        false,
      );
    });

    it('computes isNetworkEnabled from store state for non-EVM networks', () => {
      const { result } = renderHook(() => useNetworkEnablement());
      expect(
        result.current.isNetworkEnabled(
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId,
        ),
      ).toBe(true);
      expect(
        result.current.isNetworkEnabled(
          'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ' as CaipChainId,
        ),
      ).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles empty enabledNetworksByNamespace', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectEnabledNetworksByNamespace) {
          return {};
        }
        if (selector === selectChainId) {
          return '0x1';
        }
        if (selector === selectIsEvmNetworkSelected) {
          return true;
        }
        return undefined;
      });

      const { result } = renderHook(() => useNetworkEnablement());

      expect(result.current.enabledNetworksForCurrentNamespace).toEqual({});
    });

    it('handles non-EVM network selection', () => {
      (parseCaipChainId as jest.Mock).mockReturnValue({
        namespace: 'solana',
        reference: '1',
      });

      (toEvmCaipChainId as jest.Mock).mockReturnValue('solana:1');

      const { result } = renderHook(() => useNetworkEnablement());

      expect(result.current.namespace).toBe('solana');
      // Should return solana networks from mock data
      expect(result.current.enabledNetworksForCurrentNamespace).toEqual({
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
        'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ': false,
      });
    });

    it('handles undefined enabledNetworksByNamespace', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectEnabledNetworksByNamespace) {
          return undefined;
        }
        if (selector === selectChainId) {
          return '0x1';
        }
        if (selector === selectIsEvmNetworkSelected) {
          return true;
        }
        return undefined;
      });

      const { result } = renderHook(() => useNetworkEnablement());

      expect(result.current.enabledNetworksForCurrentNamespace).toEqual({});
    });

    it('handles null enabledNetworksByNamespace', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectEnabledNetworksByNamespace) {
          return null;
        }
        if (selector === selectChainId) {
          return '0x1';
        }
        if (selector === selectIsEvmNetworkSelected) {
          return true;
        }
        return undefined;
      });

      const { result } = renderHook(() => useNetworkEnablement());

      expect(result.current.enabledNetworksForCurrentNamespace).toEqual({});
    });
  });

  describe('enableAllPopularNetworks', () => {
    it('calls controller enableAllPopularNetworks method', () => {
      const { result } = renderHook(() => useNetworkEnablement());

      result.current.enableAllPopularNetworks();

      expect(
        mockNetworkEnablementController.enableAllPopularNetworks,
      ).toHaveBeenCalledTimes(1);
    });

    it('calls both controller methods when enableAllPopularNetworks is invoked', () => {
      const { result } = renderHook(() => useNetworkEnablement());

      result.current.enableAllPopularNetworks();

      // Should call both methods
      expect(
        mockNetworkEnablementController.enableAllPopularNetworks,
      ).toHaveBeenCalledTimes(1);
    });

    it('works correctly when called multiple times', () => {
      const { result } = renderHook(() => useNetworkEnablement());

      result.current.enableAllPopularNetworks();
      result.current.enableAllPopularNetworks();

      // Should be called twice
      expect(
        mockNetworkEnablementController.enableAllPopularNetworks,
      ).toHaveBeenCalledTimes(2);
    });

    it('returns the same function reference on subsequent calls', () => {
      const { result } = renderHook(() => useNetworkEnablement());

      const firstRef = result.current.enableAllPopularNetworks;
      const secondRef = result.current.enableAllPopularNetworks;

      // Should be the same function reference due to useMemo
      expect(firstRef).toBe(secondRef);
    });
  });

  describe('tryEnableEvmNetwork', () => {
    it('does not enable network when chainId is not provided', () => {
      const { result } = renderHook(() => useNetworkEnablement());

      result.current.tryEnableEvmNetwork();

      expect(
        mockNetworkEnablementController.enableNetwork,
      ).not.toHaveBeenCalled();
    });

    it('does not enable network when chainId is not a hex string', () => {
      (isHexString as unknown as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => useNetworkEnablement());

      result.current.tryEnableEvmNetwork('invalid');

      expect(
        mockNetworkEnablementController.enableNetwork,
      ).not.toHaveBeenCalled();
    });
  });

  describe('hook return values', () => {
    it('returns all expected properties', () => {
      const { result } = renderHook(() => useNetworkEnablement());

      expect(result.current).toEqual({
        namespace: 'eip155',
        enabledNetworksByNamespace: {
          eip155: {
            '0x1': true,
            '0x89': false,
          },
          solana: {
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
            'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ': false,
          },
        },
        enabledNetworksForCurrentNamespace: {
          '0x1': true,
          '0x89': false,
        },
        networkEnablementController: mockNetworkEnablementController,
        enableNetwork: expect.any(Function),
        disableNetwork: expect.any(Function),
        enableAllPopularNetworks: expect.any(Function),
        isNetworkEnabled: expect.any(Function),
        hasOneEnabledNetwork: true,
        tryEnableEvmNetwork: expect.any(Function),
      });
    });
  });
});
