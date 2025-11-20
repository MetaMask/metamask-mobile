import React, { FunctionComponent } from 'react';
import renderWithProvider, {
  renderScreen,
} from '../../../util/test/renderWithProvider';
import SearchTokenAutocomplete from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { fireEvent } from '@testing-library/react-native';
import { ImportTokenViewSelectorsIDs } from '../../../../e2e/selectors/wallet/ImportTokenView.selectors';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        useTokenDetection: true,
      },
    },
  },
};

jest.mock('../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      setTokenNetworkFilter: jest.fn(),
    },
  },
}));

describe('SearchTokenAutocomplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with selected chain', () => {
    const { toJSON } = renderScreen(
      SearchTokenAutocomplete as FunctionComponent,
      { name: 'SearchTokenAutocomplete' },
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('handles search and updates results', () => {
    const { getByTestId, getByText } = renderScreen(
      SearchTokenAutocomplete as FunctionComponent,
      { name: 'SearchTokenAutocomplete' },
      {
        state: mockInitialState,
      },
    );

    const mockAsset = { address: '0x123', symbol: 'TEST', chainId: '0x1' };

    const assetSearch = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);
    const mockResults = [mockAsset];

    fireEvent(assetSearch, 'onSearch', {
      results: mockResults,
      searchQuery: 'TEST',
      chainId: '0x1',
    });

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT),
    ).toBeTruthy();
    expect(getByText(mockAsset.symbol)).toBeTruthy();
  });

  it('displays token detection banner when detection is disabled', () => {
    const stateWithDetectionDisabled = {
      ...mockInitialState,
      engine: {
        backgroundState: {
          ...mockInitialState.engine.backgroundState,
          PreferencesController: {
            useTokenDetection: false,
          },
        },
      },
    };

    const { getByText } = renderScreen(
      SearchTokenAutocomplete as FunctionComponent,
      { name: 'SearchTokenAutocomplete' },
      {
        state: stateWithDetectionDisabled,
      },
    );

    expect(getByText(/token detection/i)).toBeTruthy();
  });

  it('navigates to ConfirmAddAsset when asset is selected', () => {
    const mockNavigation = {
      push: jest.fn(),
    };

    const { getByTestId, getByText } = renderWithProvider(
      <SearchTokenAutocomplete
        navigation={mockNavigation}
        tabLabel={''}
        selectedChainId={'0x1'}
      />,
      { state: mockInitialState },
    );

    const mockAsset = { address: '0x123', symbol: 'TEST', chainId: '0x1' };

    const assetSearch = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);

    fireEvent(assetSearch, 'onSearch', {
      results: [mockAsset],
      searchQuery: 'TEST',
      chainId: '0x1',
    });

    const selectAssetButton = getByTestId(
      ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
    );
    fireEvent.press(selectAssetButton);

    expect(getByText(mockAsset.symbol)).toBeTruthy();

    const addTokenButton = getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON);
    fireEvent.press(addTokenButton);

    const navigationCall = mockNavigation.push.mock.calls[0];
    const [screenName, params] = navigationCall;

    expect(screenName).toBe('ConfirmAddAsset');
    expect(params).toMatchObject({
      selectedAsset: [mockAsset],
      chainId: '0x1',
      ticker: 'ETH',
      networkName: 'Ethereum Main Network',
    });
  });

  it('renders with null selectedChainId', () => {
    const mockNavigation = {
      push: jest.fn(),
    };

    const { getByTestId } = renderWithProvider(
      <SearchTokenAutocomplete
        navigation={mockNavigation}
        tabLabel={''}
        selectedChainId={null}
      />,
      { state: mockInitialState },
    );

    expect(getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR)).toBeTruthy();
  });
});
