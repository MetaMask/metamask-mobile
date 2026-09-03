import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import DeFiPositionsControlBar from './DeFiPositionsControlBar';
import { strings } from '../../../../locales/i18n';
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';
import { useNavigation } from '@react-navigation/native';

jest.mock('../../../util/networks', () => ({
  ...jest.requireActual('../../../util/networks'),
  getNetworkImageSource: jest.fn(),
}));

jest.mock('../../hooks/useCurrentNetworkInfo', () => ({
  useCurrentNetworkInfo: jest.fn(() => ({
    enabledNetworks: [{ chainId: '0x1' }, { chainId: '0x89' }],
  })),
}));

jest.mock('../../hooks/useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: jest.fn(() => ({
    enableAllPopularNetworks: jest.fn(),
  })),
}));

jest.mock('../../../selectors/multichainAccounts/accounts', () => {
  const stableNullAccountSelector = () => null;
  return {
    selectSelectedInternalAccountByScope: () => stableNullAccountSelector,
  };
});

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectNetworkConfigurationsByCaipChainId: () => ({
    'eip155:1': { name: 'Ethereum Mainnet' },
  }),
}));

jest.mock('../Tokens/TokenSortBottomSheet/TokenSortBottomSheet', () => ({
  createTokensBottomSheetNavDetails: () => [
    'RootModalFlow',
    { screen: 'TokensBottomSheet' },
  ],
}));

jest.mock('../NetworkManager', () => ({
  createNetworkManagerNavDetails: (params: unknown) => [
    'RootModalFlow',
    { screen: 'NetworkManager', params },
  ],
}));

const mockStore = configureMockStore();

describe('DeFiPositionsControlBar', () => {
  let store: ReturnType<typeof mockStore>;

  const defaultProps = {
    networkFilter: null,
    onNetworkFilterChange: jest.fn(),
  };

  beforeEach(() => {
    store = mockStore({ engine: { backgroundState: {} } });
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate });
  });

  const renderComponent = (props = {}) =>
    render(
      <Provider store={store}>
        <DeFiPositionsControlBar {...defaultProps} {...props} />
      </Provider>,
    );

  it('renders the network filter button', () => {
    const { getByTestId } = renderComponent();

    expect(
      getByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER),
    ).toBeOnTheScreen();
  });

  it('shows "Popular Networks" when no network filter is set', () => {
    const { getByText } = renderComponent();

    expect(getByText(strings('wallet.popular_networks'))).toBeOnTheScreen();
  });

  it('shows the selected network name when a single network is filtered', () => {
    const { getByText } = renderComponent({
      networkFilter: ['eip155:1'],
    });

    expect(getByText('Ethereum Mainnet')).toBeOnTheScreen();
  });

  it('navigates to network manager, passing the local filter, when filter button is pressed', () => {
    const onNetworkFilterChange = jest.fn();
    const { getByTestId } = renderComponent({ onNetworkFilterChange });

    const filterButton = getByTestId(
      WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER,
    );
    fireEvent.press(filterButton);

    expect(mockNavigate).toHaveBeenCalledWith(
      'RootModalFlow',
      expect.objectContaining({
        screen: 'NetworkManager',
        params: expect.objectContaining({
          localSelectedChainIds: null,
          onLocalNetworkSelect: onNetworkFilterChange,
        }),
      }),
    );
  });

  it('is not disabled by default', () => {
    const { getByTestId } = renderComponent();

    expect(
      getByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER),
    ).not.toBeDisabled();
  });

  it('renders the sort button', () => {
    const { getByTestId } = renderComponent();

    expect(getByTestId(WalletViewSelectorsIDs.SORT_BUTTON)).toBeOnTheScreen();
  });
});
