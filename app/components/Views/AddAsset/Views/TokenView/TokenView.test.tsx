import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
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
jest.mock(
  '../../components/SearchTokenAutoComplete/SearchTokenAutocomplete',
  () => {
    const { View } = jest.requireActual('react-native');
    return (props: unknown) => {
      mockAutocomplete(props);
      return <View testID="search-token-autocomplete" />;
    };
  },
);

const mockInitialState = {
  settings: {},
  engine: { backgroundState: { ...backgroundState } },
};

const renderComponent = () =>
  renderWithProvider(<TokenView />, { state: mockInitialState });

const lastAutocompleteProps = () =>
  mockAutocomplete.mock.calls[mockAutocomplete.mock.calls.length - 1][0];

describe('TokenView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHiddenAssetIds.mockReturnValue([]);
  });

  it('shows the custom token shortcut and the token list by default', () => {
    const { getByTestId, queryByTestId } = renderComponent();

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.CUSTOM_TOKEN_BUTTON),
    ).toBeOnTheScreen();
    expect(getByTestId('search-token-autocomplete')).toBeOnTheScreen();
    expect(
      queryByTestId(ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON),
    ).toBeNull();
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

  it('opens the custom token screen from the shortcut', () => {
    const { getByTestId } = renderComponent();

    fireEvent.press(
      getByTestId(ImportTokenViewSelectorsIDs.CUSTOM_TOKEN_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.ADD_CUSTOM_TOKEN);
  });

  it('enters search mode: shortcuts leave and the network pill appears', () => {
    const { getByTestId, queryByTestId } = renderComponent();

    fireEvent.press(getByTestId('explore-view-search-button'));

    expect(
      queryByTestId(ImportTokenViewSelectorsIDs.CUSTOM_TOKEN_BUTTON),
    ).toBeNull();
    expect(
      getByTestId(ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON),
    ).toBeOnTheScreen();
    expect(lastAutocompleteProps()).toMatchObject({ isSearching: true });
  });

  it('opens the network sheet and applies the selected network', () => {
    const { getByTestId } = renderComponent();
    fireEvent.press(getByTestId('explore-view-search-button'));

    fireEvent.press(
      getByTestId(ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON),
    );

    const [route, params] = mockNavigate.mock.calls[0];
    expect(route).toBe(Routes.MODAL.TOKEN_NETWORK_FILTER);
    expect(params.selectedNetwork).toBeNull();

    act(() => params.onSelect('eip155:1'));

    expect(lastAutocompleteProps()).toMatchObject({
      selectedChainId: 'eip155:1',
    });
  });

  it('leaves search mode on Cancel and resets the network', () => {
    const { getByTestId, getByText, queryByTestId } = renderComponent();
    fireEvent.press(getByTestId('explore-view-search-button'));
    fireEvent.press(
      getByTestId(ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON),
    );
    act(() => mockNavigate.mock.calls[0][1].onSelect('eip155:1'));

    fireEvent.press(getByText('Cancel'));

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.CUSTOM_TOKEN_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON),
    ).toBeNull();
    expect(lastAutocompleteProps()).toMatchObject({
      selectedChainId: null,
      isSearching: false,
    });
  });
});
