import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import type { Hex } from '@metamask/utils';
import Routes from '../../../../../constants/navigation/Routes';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import TokenView from './TokenView';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockUseHiddenAssetIds = jest.fn();
jest.mock('../../hooks/useHiddenAssetIds', () => ({
  useHiddenAssetIds: () => mockUseHiddenAssetIds(),
}));

const mockAutocomplete = jest.fn();
const mockAutocompleteMount = jest.fn();
jest.mock(
  '../../components/SearchTokenAutoComplete/SearchTokenAutocomplete',
  () => {
    const { View } = jest.requireActual('react-native');
    const { useEffect } = jest.requireActual('react');
    return (props: unknown) => {
      useEffect(() => mockAutocompleteMount(), []);
      mockAutocomplete(props);
      return <View testID="search-token-autocomplete" />;
    };
  },
);

const mockInitialState = {
  settings: {},
  engine: { backgroundState: { ...backgroundState } },
};

const mockOpenNetworkSelector = jest.fn();
const renderComponent = (selectedNetwork: Hex | null = null) =>
  renderWithProvider(
    <TokenView
      selectedNetwork={selectedNetwork}
      openNetworkSelector={mockOpenNetworkSelector}
    />,
    { state: mockInitialState },
  );

const lastAutocompleteProps = () =>
  mockAutocomplete.mock.calls[mockAutocomplete.mock.calls.length - 1][0];

describe('TokenView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHiddenAssetIds.mockReturnValue([]);
  });

  it('shows the token list and the network filter by default', () => {
    const { getByTestId } = renderComponent();

    expect(getByTestId('search-token-autocomplete')).toBeOnTheScreen();
    expect(
      getByTestId(ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON),
    ).toBeOnTheScreen();
    expect(lastAutocompleteProps()).toMatchObject({
      selectedChainId: null,
      isSearching: false,
    });
  });

  it('hides the hidden tokens shortcut when no token is hidden', () => {
    const { queryByTestId } = renderComponent();

    expect(
      queryByTestId(ImportTokenViewSelectorsIDs.HIDDEN_TOKENS_BUTTON),
    ).toBeNull();
  });

  it('shows the hidden tokens shortcut and opens its screen', () => {
    mockUseHiddenAssetIds.mockReturnValue(['eip155:1/erc20:0xabc']);
    const { getByTestId } = renderComponent();

    fireEvent.press(
      getByTestId(ImportTokenViewSelectorsIDs.HIDDEN_TOKENS_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HIDDEN_TOKENS);
  });

  it('hides the hidden tokens shortcut in search mode but keeps the network filter', () => {
    mockUseHiddenAssetIds.mockReturnValue(['eip155:1/erc20:0xabc']);
    const { getByTestId, queryByTestId } = renderComponent();

    fireEvent.press(getByTestId('explore-view-search-button'));

    expect(
      queryByTestId(ImportTokenViewSelectorsIDs.HIDDEN_TOKENS_BUTTON),
    ).toBeNull();
    expect(
      getByTestId(ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON),
    ).toBeOnTheScreen();
    expect(lastAutocompleteProps()).toMatchObject({ isSearching: true });
  });

  it('opens the network selector from the network filter', () => {
    const { getByTestId } = renderComponent();

    fireEvent.press(
      getByTestId(ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON),
    );

    expect(mockOpenNetworkSelector).toHaveBeenCalledTimes(1);
  });

  it('remounts the search when the network changes so selections reset', () => {
    const { rerender } = renderComponent('0x1');
    expect(mockAutocompleteMount).toHaveBeenCalledTimes(1);

    rerender(
      <TokenView
        selectedNetwork="0x89"
        openNetworkSelector={mockOpenNetworkSelector}
      />,
    );

    expect(mockAutocompleteMount).toHaveBeenCalledTimes(2);
  });

  it('searches the selected network', () => {
    renderComponent('0x1');

    expect(lastAutocompleteProps()).toMatchObject({
      selectedChainId: 'eip155:1',
    });
  });

  it('leaves search mode on Cancel and keeps the selected network', () => {
    mockUseHiddenAssetIds.mockReturnValue(['eip155:1/erc20:0xabc']);
    const { getByTestId, getByText } = renderComponent('0x1');
    fireEvent.press(getByTestId('explore-view-search-button'));

    fireEvent.press(getByText('Cancel'));

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.HIDDEN_TOKENS_BUTTON),
    ).toBeOnTheScreen();
    expect(lastAutocompleteProps()).toMatchObject({
      selectedChainId: 'eip155:1',
      isSearching: false,
    });
  });
});
