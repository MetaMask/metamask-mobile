import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { parseCaipChainId, CaipChainId } from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { toHex } from '@metamask/controller-utils';
import Engine from '../../../core/Engine';

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

jest.mock('../../../core/Engine', () => ({
  context: {
    NetworkEnablementController: {
      setEnabledNetwork: jest.fn(),
      setDisabledNetwork: jest.fn(),
      isNetworkEnabled: jest.fn(),
    },
  },
}));

jest.mock('@metamask/utils', () => ({
  parseCaipChainId: jest.fn(),
  CaipChainId: jest.fn(),
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

const mockNetworkEnablementController = {
  setEnabledNetwork: jest.fn(),
  setDisabledNetwork: jest.fn(),
  isNetworkEnabled: jest.fn(),
};

describe('useNetworkEnablement', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockImplementation((selector) => {
      const selectorStr = selector.toString();
      if (selectorStr.includes('selectEnabledNetworksByNamespace')) {
        return {
          eip155: {
            '0x1': true,
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

    mockUseSelector.mockReturnValue({
      eip155: {
        '0x1': true,
        '0x89': false,
      },
    });

    (parseCaipChainId as jest.Mock).mockReturnValue({
      namespace: 'eip155',
      reference: '1',
    });
    (toEvmCaipChainId as jest.Mock).mockReturnValue('eip155:1');
    (toHex as jest.Mock).mockImplementation((value) => `0x${value}`);

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
      expect(result.current).toHaveProperty('toggleNetwork');
      expect(result.current).toHaveProperty('isNetworkEnabled');
    });

    it('returns functions for network operations', () => {
      const { result } = renderHook(() => useNetworkEnablement());

      expect(typeof result.current.enableNetwork).toBe('function');
      expect(typeof result.current.disableNetwork).toBe('function');
      expect(typeof result.current.toggleNetwork).toBe('function');
      expect(typeof result.current.isNetworkEnabled).toBe('function');
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

  describe('network operations', () => {
    it('calls setEnabledNetwork when enableNetwork is called', () => {
      const chainId = 'eip155:1' as CaipChainId;

      const { result } = renderHook(() => useNetworkEnablement());
      result.current.enableNetwork(chainId);

      expect(
        mockNetworkEnablementController.setEnabledNetwork,
      ).toHaveBeenCalledWith(chainId);
    });

    it('calls setDisabledNetwork when disableNetwork is called', () => {
      const chainId = 'eip155:1' as CaipChainId;

      const { result } = renderHook(() => useNetworkEnablement());
      result.current.disableNetwork(chainId);

      expect(
        mockNetworkEnablementController.setDisabledNetwork,
      ).toHaveBeenCalledWith(chainId);
    });

    it('calls isNetworkEnabled when isNetworkEnabled is called', () => {
      const chainId = 'eip155:1' as CaipChainId;
      mockNetworkEnablementController.isNetworkEnabled.mockReturnValue(true);

      const { result } = renderHook(() => useNetworkEnablement());
      const isEnabled = result.current.isNetworkEnabled(chainId);

      expect(
        mockNetworkEnablementController.isNetworkEnabled,
      ).toHaveBeenCalledWith(chainId);
      expect(isEnabled).toBe(true);
    });
  });

  describe('toggleNetwork logic', () => {
    it('disables network when both controller and namespace show it as enabled', () => {
      const chainId = 'eip155:1' as CaipChainId;
      mockNetworkEnablementController.isNetworkEnabled.mockReturnValue(true);

      const { result } = renderHook(() => useNetworkEnablement());
      result.current.toggleNetwork(chainId);

      expect(
        mockNetworkEnablementController.setDisabledNetwork,
      ).toHaveBeenCalledWith(chainId);
      expect(
        mockNetworkEnablementController.setEnabledNetwork,
      ).not.toHaveBeenCalled();
    });

    it('enables network when controller shows it as disabled', () => {
      const chainId = 'eip155:1' as CaipChainId;
      mockNetworkEnablementController.isNetworkEnabled.mockReturnValue(false);

      const { result } = renderHook(() => useNetworkEnablement());
      result.current.toggleNetwork(chainId);

      expect(
        mockNetworkEnablementController.setEnabledNetwork,
      ).toHaveBeenCalledWith(chainId);
      expect(
        mockNetworkEnablementController.setDisabledNetwork,
      ).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles empty enabledNetworksByNamespace', () => {
      mockUseSelector.mockImplementation((selector) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectEnabledNetworksByNamespace')) {
          return {};
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
      // Since the default mock data doesn't include solana, it should return empty object
      expect(result.current.enabledNetworksForCurrentNamespace).toEqual({});
    });

    it('handles undefined enabledNetworksByNamespace', () => {
      mockUseSelector.mockImplementation((selector) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectEnabledNetworksByNamespace')) {
          return undefined;
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

      expect(result.current.enabledNetworksForCurrentNamespace).toEqual({});
    });

    it('handles null enabledNetworksByNamespace', () => {
      mockUseSelector.mockImplementation((selector) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectEnabledNetworksByNamespace')) {
          return null;
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
      });
    });
  });
});
