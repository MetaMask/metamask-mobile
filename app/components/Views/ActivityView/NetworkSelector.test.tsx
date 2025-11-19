import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ActivityNetworkSelector } from './NetworkSelector';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectNetworkName } from '../../../selectors/networkInfos';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts';
import {
  isRemoveGlobalNetworkSelectorEnabled,
  getNetworkImageSource,
} from '../../../util/networks';
import { useCurrentNetworkInfo } from '../../hooks/useCurrentNetworkInfo';
import { useNetworksByNamespace } from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import Avatar from '../../../component-library/components/Avatars/Avatar';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      background: { default: '#FFFFFF' },
      border: { default: '#E0E0E0' },
      text: { default: '#000000' },
    },
  })),
}));

jest.mock('../../../util/networks', () => ({
  isRemoveGlobalNetworkSelectorEnabled: jest.fn(() => false),
  getNetworkImageSource: jest.fn(() => ({ uri: 'test-network-image' })),
}));

jest.mock('../../hooks/useCurrentNetworkInfo', () => ({
  useCurrentNetworkInfo: jest.fn(() => ({
    enabledNetworks: [{ chainId: '0x1', enabled: true }],
    getNetworkInfo: jest.fn(() => ({ networkName: 'Ethereum Mainnet' })),
    isDisabled: false,
  })),
}));

jest.mock('../../hooks/useNetworksByNamespace/useNetworksByNamespace', () => ({
  useNetworksByNamespace: jest.fn(() => ({
    areAllNetworksSelected: false,
  })),
  NetworkType: {
    Popular: 'popular',
  },
}));

jest.mock('../../UI/NetworkManager', () => ({
  createNetworkManagerNavDetails: jest.fn(() => ['NetworkManager', {}]),
}));

jest.mock('../../UI/Tokens/TokensBottomSheet', () => ({
  createTokenBottomSheetFilterNavDetails: jest.fn(() => [
    'TokensBottomSheet',
    {},
  ]),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('../../../selectors/multichain', () => ({
  selectNonEvmTransactions: jest.fn(() => ({
    transactions: [],
    next: null,
    lastUpdated: 0,
  })),
  selectSelectedNonEvmNetworkSymbol: jest.fn(() => null),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectProviderConfig: jest.fn(() => ({ type: 'mainnet', chainId: '0x1' })),
  selectChainId: jest.fn(() => '0x1'),
  selectIsPopularNetwork: jest.fn(() => false),
  selectProviderType: jest.fn(() => 'mainnet'),
  selectSelectedNetworkClientId: jest.fn(() => 'selectedNetworkClientId'),
  selectEvmNetworkConfigurationsByChainId: jest.fn(() => ({})),
}));

jest.mock('../../../selectors/multichainNetworkController', () => ({
  selectIsEvmNetworkSelected: jest.fn(() => true),
  selectSelectedNonEvmNetworkChainId: jest.fn(() => null),
  selectSelectedNonEvmNetworkName: jest.fn(() => null),
}));

jest.mock('../../../selectors/networkInfos', () => ({
  selectNetworkName: jest.fn(() => 'Ethereum Mainnet'),
  selectEvmTicker: jest.fn(() => 'ETH'),
  selectSelectedNonEvmNetworkSymbol: jest.fn(() => null),
  selectTicker: jest.fn(() => 'ETH'),
}));

jest.mock(
  '../../../selectors/featureFlagController/multichainAccounts',
  () => ({
    selectMultichainAccountsState2Enabled: jest.fn(() => false),
  }),
);

const mockNavigate = jest.fn();
const mockUseCurrentNetworkInfo = useCurrentNetworkInfo as jest.MockedFunction<
  typeof useCurrentNetworkInfo
>;
const mockUseNetworksByNamespace =
  useNetworksByNamespace as jest.MockedFunction<typeof useNetworksByNamespace>;
const mockIsRemoveGlobalNetworkSelectorEnabled =
  isRemoveGlobalNetworkSelectorEnabled as jest.MockedFunction<
    typeof isRemoveGlobalNetworkSelectorEnabled
  >;
const mockGetNetworkImageSource = getNetworkImageSource as jest.MockedFunction<
  typeof getNetworkImageSource
>;
const mockSelectIsEvmNetworkSelected =
  selectIsEvmNetworkSelected as jest.MockedFunction<
    typeof selectIsEvmNetworkSelected
  >;
const mockSelectNetworkName = selectNetworkName as jest.MockedFunction<
  typeof selectNetworkName
>;
const mockSelectMultichainAccountsState2Enabled =
  selectMultichainAccountsState2Enabled as jest.MockedFunction<
    typeof selectMultichainAccountsState2Enabled
  >;

describe('ActivityNetworkSelector', () => {
  const defaultNetworkInfo = {
    enabledNetworks: [{ chainId: '0x1', enabled: true }],
    getNetworkInfo: jest.fn(() => ({
      caipChainId: 'eip155:1',
      networkName: 'Ethereum Mainnet',
    })),
    getNetworkInfoByChainId: jest.fn(() => ({
      caipChainId: 'eip155:1',
      networkName: 'Ethereum Mainnet',
    })),
    isDisabled: false,
    hasEnabledNetworks: true,
  };

  const defaultNetworksByNamespace = {
    selectedNetworks: [],
    areAllNetworksSelected: false,
    areAnyNetworksSelected: false,
    networkCount: 0,
    selectedCount: 0,
    networks: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });

    // Setup default mocks
    mockUseCurrentNetworkInfo.mockReturnValue(defaultNetworkInfo);
    mockUseNetworksByNamespace.mockReturnValue(defaultNetworksByNamespace);
    mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
    mockGetNetworkImageSource.mockReturnValue({ uri: 'test-network-image' });
    mockSelectIsEvmNetworkSelected.mockReturnValue(true);
    mockSelectNetworkName.mockReturnValue('Ethereum Mainnet');
    mockSelectMultichainAccountsState2Enabled.mockReturnValue(false);

    // Setup useSelector to call the mocked selector functions
    (useSelector as jest.Mock).mockImplementation((selector) => selector({}));
  });

  describe('Rendering', () => {
    it('renders with network filter button', () => {
      const { getByTestId } = render(<ActivityNetworkSelector />);

      const button = getByTestId('tokens-network-filter');

      expect(button).toBeTruthy();
    });

    it('displays current network name when available', () => {
      const { getByTestId, getByText } = render(<ActivityNetworkSelector />);

      const button = getByTestId('tokens-network-filter');

      expect(button).toBeTruthy();
      expect(getByText('Ethereum Mainnet')).toBeTruthy();
    });

    it('displays fallback text when network name is null', () => {
      mockSelectNetworkName.mockReturnValueOnce(null as never);

      const { getByText } = render(<ActivityNetworkSelector />);

      expect(getByText('wallet.current_network')).toBeTruthy();
    });
  });

  describe('Feature Flag: isRemoveGlobalNetworkSelectorEnabled = false', () => {
    it('navigates to TokensBottomSheet when pressed', () => {
      const { getByTestId } = render(<ActivityNetworkSelector />);
      const button = getByTestId('tokens-network-filter');

      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalledWith('TokensBottomSheet', {});
    });

    it('displays network name in simple text format', () => {
      const { getByText } = render(<ActivityNetworkSelector />);

      expect(getByText('Ethereum Mainnet')).toBeTruthy();
    });
  });

  describe('Feature Flag: isRemoveGlobalNetworkSelectorEnabled = true', () => {
    beforeEach(() => {
      mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
    });

    it('navigates to NetworkManager when pressed', () => {
      const { getByTestId } = render(<ActivityNetworkSelector />);
      const button = getByTestId('tokens-network-filter');

      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalledWith('NetworkManager', {});
    });

    it('displays popular networks text when multiple networks are enabled', () => {
      mockUseCurrentNetworkInfo.mockReturnValue({
        enabledNetworks: [
          { chainId: '0x1', enabled: true },
          { chainId: '0x89', enabled: true },
        ],
        getNetworkInfo: jest.fn(() => ({
          caipChainId: 'eip155:1',
          networkName: 'Ethereum Mainnet',
        })),
        getNetworkInfoByChainId: jest.fn(() => ({
          caipChainId: 'eip155:1',
          networkName: 'Ethereum Mainnet',
        })),
        isDisabled: false,
        hasEnabledNetworks: true,
      });

      const { getByText } = render(<ActivityNetworkSelector />);

      expect(getByText('wallet.popular_networks')).toBeTruthy();
    });

    it('displays current network name when only one network is enabled', () => {
      mockUseCurrentNetworkInfo.mockReturnValue({
        enabledNetworks: [{ chainId: '0x1', enabled: true }],
        getNetworkInfo: jest.fn(() => ({
          caipChainId: 'eip155:1',
          networkName: 'Ethereum Mainnet',
        })),
        getNetworkInfoByChainId: jest.fn(() => ({
          caipChainId: 'eip155:1',
          networkName: 'Ethereum Mainnet',
        })),
        isDisabled: false,
        hasEnabledNetworks: true,
      });

      const { getByText } = render(<ActivityNetworkSelector />);

      expect(getByText('Ethereum Mainnet')).toBeTruthy();
    });

    it('renders network avatar when not all networks are selected', () => {
      mockUseNetworksByNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: false,
      });

      const { UNSAFE_getByType } = render(<ActivityNetworkSelector />);

      expect(() => UNSAFE_getByType(Avatar)).not.toThrow();
    });

    it('hides network avatar when all networks are selected', () => {
      mockUseNetworksByNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: true,
      });

      const { UNSAFE_queryByType } = render(<ActivityNetworkSelector />);
      const avatar = UNSAFE_queryByType(Avatar);

      expect(avatar).toBeNull();
    });
  });

  describe('Disabled State', () => {
    it('renders in disabled state when isDisabled is true and multichain accounts state 2 is disabled', () => {
      mockUseCurrentNetworkInfo.mockReturnValue({
        enabledNetworks: [{ chainId: '0x1', enabled: true }],
        getNetworkInfo: jest.fn(() => ({
          caipChainId: 'eip155:1',
          networkName: 'Ethereum Mainnet',
        })),
        getNetworkInfoByChainId: jest.fn(() => ({
          caipChainId: 'eip155:1',
          networkName: 'Ethereum Mainnet',
        })),
        isDisabled: true,
        hasEnabledNetworks: true,
      });

      const { getByTestId } = render(<ActivityNetworkSelector />);
      const button = getByTestId('tokens-network-filter');

      expect(button).toBeTruthy();
    });

    it('enables navigation when multichain accounts state 2 is enabled despite isDisabled', () => {
      mockUseCurrentNetworkInfo.mockReturnValue({
        enabledNetworks: [{ chainId: '0x1', enabled: true }],
        getNetworkInfo: jest.fn(() => ({
          caipChainId: 'eip155:1',
          networkName: 'Ethereum Mainnet',
        })),
        getNetworkInfoByChainId: jest.fn(() => ({
          caipChainId: 'eip155:1',
          networkName: 'Ethereum Mainnet',
        })),
        isDisabled: true,
        hasEnabledNetworks: true,
      });
      mockSelectMultichainAccountsState2Enabled.mockReturnValueOnce(true);

      const { getByTestId } = render(<ActivityNetworkSelector />);
      const button = getByTestId('tokens-network-filter');

      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('Non-EVM Networks', () => {
    it('prevents navigation when EVM is not selected and multichain accounts state 2 is disabled', () => {
      mockSelectIsEvmNetworkSelected.mockReturnValueOnce(false);
      mockSelectNetworkName.mockReturnValueOnce('Solana Mainnet');

      const { getByTestId } = render(<ActivityNetworkSelector />);
      const button = getByTestId('tokens-network-filter');

      fireEvent.press(button);

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('allows navigation when EVM is not selected but multichain accounts state 2 is enabled', () => {
      mockSelectIsEvmNetworkSelected.mockReturnValueOnce(false);
      mockSelectNetworkName.mockReturnValueOnce('Solana Mainnet');
      mockSelectMultichainAccountsState2Enabled.mockReturnValueOnce(true);

      const { getByTestId } = render(<ActivityNetworkSelector />);
      const button = getByTestId('tokens-network-filter');

      fireEvent.press(button);

      expect(mockNavigate).toHaveBeenCalled();
    });

    it('renders button when EVM is not selected and multichain accounts state 2 is disabled', () => {
      mockSelectIsEvmNetworkSelected.mockReturnValueOnce(false);
      mockSelectNetworkName.mockReturnValueOnce('Solana Mainnet');

      const { getByTestId } = render(<ActivityNetworkSelector />);
      const button = getByTestId('tokens-network-filter');

      expect(button).toBeTruthy();
    });
  });

  describe('Integration', () => {
    it('passes chainId to getNetworkImageSource', () => {
      mockUseCurrentNetworkInfo.mockReturnValue({
        enabledNetworks: [{ chainId: '0x89', enabled: true }],
        getNetworkInfo: jest.fn(() => ({
          caipChainId: 'eip155:137',
          networkName: 'Polygon',
        })),
        getNetworkInfoByChainId: jest.fn(() => ({
          caipChainId: 'eip155:137',
          networkName: 'Polygon',
        })),
        isDisabled: false,
        hasEnabledNetworks: true,
      });

      render(<ActivityNetworkSelector />);

      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: '0x89',
      });
    });

    it('handles empty chainId gracefully', () => {
      mockUseCurrentNetworkInfo.mockReturnValue({
        enabledNetworks: [],
        getNetworkInfo: jest.fn(() => null),
        getNetworkInfoByChainId: jest.fn(() => null),
        isDisabled: false,
        hasEnabledNetworks: false,
      });

      render(<ActivityNetworkSelector />);

      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: '',
      });
    });
  });
});
