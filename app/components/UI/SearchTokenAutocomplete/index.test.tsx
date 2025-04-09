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

describe('SearchTokenAutocomplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      SearchTokenAutocomplete as FunctionComponent,
      { name: 'SearchTokenAutocomplete' },
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should handle search and update results', () => {
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

  it('should show token detection banner when detection is disabled', () => {
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

  it('should handle select asset', () => {
    const mockNavigation = {
      push: jest.fn(),
    };

    const mockOnPress = jest.fn();

    const { getByTestId, getByText, debug } = renderWithProvider(
      <SearchTokenAutocomplete
        navigation={mockNavigation}
        tabLabel={''}
        onPress={mockOnPress}
        isAllNetworksEnabled={false}
        allNetworksEnabled={{}}
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
      chainId: mockAsset.chainId,
      ticker: 'ETH',
      networkName: 'Ethereum Main Network',
    });
  });
});
