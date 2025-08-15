import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { parseCaipChainId, CaipChainId } from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { toHex } from '@metamask/controller-utils';

jest.mock('@metamask/keyring-utils', () => ({}));
jest.mock('@metamask/keyring-api', () => ({}));
jest.mock('@metamask/rpc-errors', () => ({}));
jest.mock('@metamask/network-controller', () => ({}));
jest.mock('@metamask/controller-utils', () => ({
  hasProperty: jest.fn(),
  toHex: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@metamask/utils', () => ({
  parseCaipChainId: jest.fn(),
  CaipChainId: jest.fn(),
  KnownCaipNamespace: {
    Eip155: 'eip155',
    Solana: 'solana',
  },
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

jest.mock('../../../core/Engine', () => {
  const mockNetworkEnablementController = {
    enableNetwork: jest.fn(),
    disableNetwork: jest.fn(),
    isNetworkEnabled: jest.fn(),
    hasOneEnabledNetwork: jest.fn(),
  };

  return {
    context: {
      NetworkEnablementController: mockNetworkEnablementController,
    },
  };
});

import { useNetworkEnablement } from './useNetworkEnablement';
import { selectEnabledNetworksByNamespace } from '../../../selectors/networkEnablementController';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectChainId } from '../../../selectors/networkController';
import Engine from '../../../core/Engine';

const mockNetworkEnablementController =
  Engine.context.NetworkEnablementController;

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
      expect(result.current).toHaveProperty('toggleNetwork');
      expect(result.current).toHaveProperty('isNetworkEnabled');
      expect(result.current).toHaveProperty('hasOneEnabledNetwork');
    });

    it('returns functions for network operations', () => {
      const { result } = renderHook(() => useNetworkEnablement());

      expect(typeof result.current.enableNetwork).toBe('function');
      expect(typeof result.current.disableNetwork).toBe('function');
      expect(typeof result.current.toggleNetwork).toBe('function');
      expect(typeof result.current.isNetworkEnabled).toBe('function');
      expect(typeof result.current.hasOneEnabledNetwork).toBe('boolean');
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
        if (selector === selectEnabledNetworksByNamespace) {
          return {
            eip155: {
              '0x1': false,
              '0x89': false,
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

      const { result } = renderHook(() => useNetworkEnablement());

      expect(result.current.hasOneEnabledNetwork).toBe(false);
    });

    it('returns false when multiple networks are enabled', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectEnabledNetworksByNamespace) {
          return {
            eip155: {
              '0x1': true,
              '0x89': true,
              '0x38': true,
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

      const { result } = renderHook(() => useNetworkEnablement());

      expect(result.current.hasOneEnabledNetwork).toBe(false);
    });

    it('returns false when enabled networks object is empty', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectEnabledNetworksByNamespace) {
          return {
            eip155: {},
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

      const { result } = renderHook(() => useNetworkEnablement());

      expect(result.current.hasOneEnabledNetwork).toBe(false);
    });
  });

  describe('network operations', () => {
    it('calls enableNetwork when enableNetwork is called', () => {
      const chainId = 'eip155:1' as CaipChainId;

      const { result } = renderHook(() => useNetworkEnablement());
      result.current.enableNetwork(chainId);

      expect(
        mockNetworkEnablementController.enableNetwork,
      ).toHaveBeenCalledWith(chainId);
    });

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

  describe('toggleNetwork logic', () => {
    it('enables network when store shows it as enabled (single network protection)', () => {
      const chainId = 'eip155:1' as CaipChainId;

      const { result } = renderHook(() => useNetworkEnablement());
      result.current.toggleNetwork(chainId);

      // When there's only one network enabled, toggle should enable it (no-op behavior)
      expect(
        mockNetworkEnablementController.enableNetwork,
      ).toHaveBeenCalledWith(chainId);
      expect(
        mockNetworkEnablementController.disableNetwork,
      ).not.toHaveBeenCalled();
    });

    it('enables network when store shows it as disabled', () => {
      const chainId = 'eip155:89' as CaipChainId;

      const { result } = renderHook(() => useNetworkEnablement());
      result.current.toggleNetwork(chainId);

      expect(
        mockNetworkEnablementController.enableNetwork,
      ).toHaveBeenCalledWith(chainId);
      expect(
        mockNetworkEnablementController.disableNetwork,
      ).not.toHaveBeenCalled();
    });

    it('enables non-EVM network when store shows it as enabled (single network protection)', () => {
      const chainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId;

      const { result } = renderHook(() => useNetworkEnablement());
      result.current.toggleNetwork(chainId);

      // When there's only one network enabled, toggle should enable it (no-op behavior)
      expect(
        mockNetworkEnablementController.enableNetwork,
      ).toHaveBeenCalledWith(chainId);
      expect(
        mockNetworkEnablementController.disableNetwork,
      ).not.toHaveBeenCalled();
    });

    it('enables non-EVM network when store shows it as disabled', () => {
      const chainId = 'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ' as CaipChainId;

      const { result } = renderHook(() => useNetworkEnablement());
      result.current.toggleNetwork(chainId);

      expect(
        mockNetworkEnablementController.enableNetwork,
      ).toHaveBeenCalledWith(chainId);
      expect(
        mockNetworkEnablementController.disableNetwork,
      ).not.toHaveBeenCalled();
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
        toggleNetwork: expect.any(Function),
        isNetworkEnabled: expect.any(Function),
        hasOneEnabledNetwork: true,
      });
    });
  });

  describe('single network protection logic', () => {
    it('enables network when only one network is enabled (no-op behavior)', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectEnabledNetworksByNamespace) {
          return {
            eip155: {
              '0x1': true,
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

      const chainId = 'eip155:1' as CaipChainId;
      const { result } = renderHook(() => useNetworkEnablement());

      result.current.toggleNetwork(chainId);

      // When there's only one network enabled, toggle should enable it (no-op behavior)
      expect(
        mockNetworkEnablementController.enableNetwork,
      ).toHaveBeenCalledWith(chainId);

      expect(
        mockNetworkEnablementController.disableNetwork,
      ).not.toHaveBeenCalled();
    });

    it('allows disabling when multiple networks are enabled', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectEnabledNetworksByNamespace) {
          return {
            eip155: {
              '0x1': true,
              '0x89': true, // Multiple networks enabled
              '0xa': true,
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

      const chainId = 'eip155:1' as CaipChainId;
      const { result } = renderHook(() => useNetworkEnablement());
      result.current.toggleNetwork(chainId);

      expect(
        mockNetworkEnablementController.disableNetwork,
      ).toHaveBeenCalledWith(chainId);

      expect(
        mockNetworkEnablementController.enableNetwork,
      ).not.toHaveBeenCalled();
    });

    it('allows enabling when no networks are enabled', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectEnabledNetworksByNamespace) {
          return {
            eip155: {
              '0x1': false,
              '0x89': false,
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

      const chainId = 'eip155:1' as CaipChainId;
      const { result } = renderHook(() => useNetworkEnablement());

      result.current.toggleNetwork(chainId);

      expect(
        mockNetworkEnablementController.enableNetwork,
      ).toHaveBeenCalledWith(chainId);

      expect(
        mockNetworkEnablementController.disableNetwork,
      ).not.toHaveBeenCalled();
    });

    it('enables non-EVM network when only one network is enabled (no-op behavior)', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectEnabledNetworksByNamespace) {
          return {
            solana: {
              '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
            },
          };
        }
        if (selector === selectChainId) {
          return 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
        }
        if (selector === selectIsEvmNetworkSelected) {
          return false;
        }
        return undefined;
      });

      (parseCaipChainId as jest.Mock).mockReturnValue({
        namespace: 'solana',
        reference: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      });

      (toEvmCaipChainId as jest.Mock).mockReturnValue(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );

      const chainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId;
      const { result } = renderHook(() => useNetworkEnablement());

      result.current.toggleNetwork(chainId);

      // When there's only one network enabled, toggle should enable it (no-op behavior)
      expect(
        mockNetworkEnablementController.enableNetwork,
      ).toHaveBeenCalledWith(chainId);

      expect(
        mockNetworkEnablementController.disableNetwork,
      ).not.toHaveBeenCalled();
    });

    it('handles toggleNetwork when current namespace is missing from enabledNetworksByNamespace', () => {
      // Setup state where enabledNetworksByNamespace exists but current namespace is undefined
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectEnabledNetworksByNamespace) {
          return {
            solana: {
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
            },
            // Notice eip155 namespace is missing, but current chain is eip155
          };
        }
        if (selector === selectChainId) {
          return '0x1'; // EVM chain
        }
        if (selector === selectIsEvmNetworkSelected) {
          return true;
        }
        return undefined;
      });

      (parseCaipChainId as jest.Mock).mockReturnValue({
        namespace: 'eip155',
        reference: '1',
      });

      (toEvmCaipChainId as jest.Mock).mockReturnValue('eip155:1');

      const chainId = 'eip155:1' as CaipChainId;
      const { result } = renderHook(() => useNetworkEnablement());

      // This should trigger the || {} fallback in Object.keys(enabledNetworksByNamespace[namespace] || {})
      result.current.toggleNetwork(chainId);

      // Since no networks are enabled in the current namespace (undefined), should enable
      expect(
        mockNetworkEnablementController.enableNetwork,
      ).toHaveBeenCalledWith(chainId);

      expect(
        mockNetworkEnablementController.disableNetwork,
      ).not.toHaveBeenCalled();
    });
  });
});
