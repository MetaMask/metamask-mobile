import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { TokenListControlBar } from './TokenListControlBar';
import { useNavigation } from '@react-navigation/native';
import { WalletViewSelectorsIDs } from '../../../Views/Wallet/WalletView.testIds';

jest.mock('../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(),
}));

jest.mock('../../../hooks/useCurrentNetworkInfo', () => ({
  useCurrentNetworkInfo: jest.fn(() => ({
    enabledNetworks: [{ chainId: '0x1' }, { chainId: '0x89' }],
  })),
}));

jest.mock('../../../hooks/useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: jest.fn(() => ({
    enableAllPopularNetworks: jest.fn(),
  })),
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => {
  const stableNullAccountSelector = () => null;
  return {
    selectSelectedInternalAccountByScope: () => stableNullAccountSelector,
  };
});

// Mock the navigation hook
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock the navigation functions
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
};

// Mock the useNavigation hook
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

// Mock the navigation details creators
jest.mock('../TokenSortBottomSheet/TokenSortBottomSheet', () => ({
  createTokensBottomSheetNavDetails: jest.fn(() => ['TokensBottomSheet', {}]),
}));

jest.mock('../../NetworkManager', () => ({
  createNetworkManagerNavDetails: jest.fn((params: unknown) => [
    'NetworkManager',
    params,
  ]),
}));

// Mock the strings function
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectNetworkConfigurationsByCaipChainId: () => ({
    'eip155:1': { name: 'Ethereum Mainnet' },
    'eip155:137': { name: 'Polygon' },
  }),
}));

// Mock the theme
jest.mock('../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../util/theme');
  return {
    useTheme: () => mockTheme,
  };
});

const mockStore = configureMockStore();

describe('TokenListControlBar', () => {
  const defaultProps = {
    goToAddToken: jest.fn(),
    networkFilter: null,
    onNetworkFilterChange: jest.fn(),
  };

  const defaultState = {
    engine: {
      backgroundState: {},
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue(
      mockNavigation as unknown as ReturnType<typeof useNavigation>,
    );
  });

  const renderComponent = (props = {}, state = {}) => {
    const store = mockStore({ ...defaultState, ...state });
    return render(
      <Provider store={store}>
        <TokenListControlBar {...defaultProps} {...props} />
      </Provider>,
    );
  };

  describe('Network Manager Integration', () => {
    it('navigates to NetworkManager, passing the local filter, when filter button is pressed', () => {
      const onNetworkFilterChange = jest.fn();
      const { getByTestId } = renderComponent({ onNetworkFilterChange });

      const filterButton = getByTestId(
        WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER,
      );
      fireEvent.press(filterButton);

      expect(mockNavigate).toHaveBeenCalledWith('NetworkManager', {
        localSelectedChainIds: null,
        onLocalNetworkSelect: onNetworkFilterChange,
      });
    });

    it('shows the selected network name when a single network is filtered', () => {
      const { getByText } = renderComponent({
        networkFilter: ['eip155:1'],
      });

      expect(getByText('Ethereum Mainnet')).toBeTruthy();
    });

    it('shows "Popular Networks" when no network filter is set', () => {
      const { getByText } = renderComponent();

      expect(getByText('wallet.popular_networks')).toBeTruthy();
    });
  });

  describe('Button interactions', () => {
    it('calls goToAddToken when add token button is pressed', () => {
      const goToAddToken = jest.fn();
      const { getByTestId } = renderComponent({ goToAddToken });

      const addTokenButton = getByTestId('import-token-button');
      fireEvent.press(addTokenButton);

      expect(goToAddToken).toHaveBeenCalled();
    });
  });

  describe('Button states', () => {
    it('does not disable filter button by default', () => {
      const { getByTestId } = renderComponent();
      const filterButton = getByTestId(
        WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER,
      );

      expect(filterButton).toBeEnabled();
    });

    it('renders add token button as enabled', () => {
      const { getByTestId } = renderComponent();
      const addTokenButton = getByTestId('import-token-button');

      expect(addTokenButton).toBeEnabled();
    });
  });

  describe('showAddToken and hideSort (Cash view)', () => {
    it('does not render add token button when showAddToken is false', () => {
      const { queryByTestId } = renderComponent({
        showAddToken: false,
      });

      expect(queryByTestId('import-token-button')).toBeNull();
    });

    it('renders network filter when showAddToken is false', () => {
      const { getByTestId } = renderComponent({
        showAddToken: false,
      });

      expect(
        getByTestId(WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER),
      ).toBeOnTheScreen();
    });
  });
});
