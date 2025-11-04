import React, { FunctionComponent } from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider, {
  renderScreen,
} from '../../../util/test/renderWithProvider';
import SearchTokenAutocomplete from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { ImportTokenViewSelectorsIDs } from '../../../../e2e/selectors/wallet/ImportTokenView.selectors';
import { BridgeToken } from '../Bridge/types';

const mockAllTokens: BridgeToken[] = [
  {
    address: '0x123',
    symbol: 'TEST',
    name: 'Test Token',
    decimals: 18,
    chainId: '0x1',
  },
  {
    address: '0x456',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    chainId: '0x1',
  },
];

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

const mockAddTokens = jest.fn();
const mockAddAssets = jest.fn();

jest.mock('../../../core/Engine', () => ({
  context: {
    TokensController: {
      addTokens: mockAddTokens,
    },
    MultichainAssetsController: {
      addAssets: mockAddAssets,
    },
    NetworkController: {
      state: {
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1',
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
              },
            ],
            defaultRpcEndpointIndex: 0,
          },
        },
      },
    },
    PreferencesController: {
      setTokenNetworkFilter: jest.fn(),
    },
  },
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: jest.fn(() => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  })),
}));

jest.mock('../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    InteractionManager: {
      runAfterInteractions: jest.fn((callback) => callback()),
    },
  };
});

describe('SearchTokenAutocomplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });
    mockBuild.mockReturnValue({ event: 'mock-event' });
  });

  it('renders correctly with selected chain', () => {
    const WrapperComponent = () => (
      <SearchTokenAutocomplete
        navigation={{ push: jest.fn(), navigate: jest.fn() }}
        tabLabel=""
        selectedChainId="0x1"
        allTokens={mockAllTokens}
      />
    );

    const { toJSON } = renderScreen(
      WrapperComponent as FunctionComponent,
      { name: 'SearchTokenAutocomplete' },
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('updates search results when search query changes', () => {
    const WrapperComponent = () => (
      <SearchTokenAutocomplete
        navigation={{ push: jest.fn(), navigate: jest.fn() }}
        tabLabel=""
        selectedChainId="0x1"
        allTokens={mockAllTokens}
      />
    );

    const { getByTestId, getByText } = renderScreen(
      WrapperComponent as FunctionComponent,
      { name: 'SearchTokenAutocomplete' },
      {
        state: mockInitialState,
      },
    );

    const mockAsset = {
      address: '0x123',
      symbol: 'TEST',
      name: 'Test Token',
      decimals: 18,
      chainId: '0x1',
    };

    const assetSearch = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);
    const mockResults = [mockAsset];

    fireEvent(assetSearch, 'onSearch', {
      results: mockResults,
      searchQuery: 'TEST',
    });

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT),
    ).toBeOnTheScreen();
    expect(getByText(mockAsset.symbol)).toBeOnTheScreen();
  });

  it('displays token detection banner when detection is disabled and search is not focused', () => {
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

    const WrapperComponent = () => (
      <SearchTokenAutocomplete
        navigation={{ push: jest.fn(), navigate: jest.fn() }}
        tabLabel=""
        selectedChainId="0x1"
        allTokens={mockAllTokens}
      />
    );

    const { getByText } = renderScreen(
      WrapperComponent as FunctionComponent,
      { name: 'SearchTokenAutocomplete' },
      {
        state: stateWithDetectionDisabled,
      },
    );

    expect(getByText(/token detection/i)).toBeOnTheScreen();
  });

  it('hides token detection banner when search is focused', () => {
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

    const WrapperComponent = () => (
      <SearchTokenAutocomplete
        navigation={{ push: jest.fn(), navigate: jest.fn() }}
        tabLabel=""
        selectedChainId="0x1"
        allTokens={mockAllTokens}
      />
    );

    const { getByTestId, queryByText } = renderScreen(
      WrapperComponent as FunctionComponent,
      { name: 'SearchTokenAutocomplete' },
      {
        state: stateWithDetectionDisabled,
      },
    );

    const assetSearch = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);
    fireEvent(assetSearch, 'focus');

    expect(queryByText(/token detection/i)).toBeNull();
  });

  it('navigates to ConfirmAddAsset when next button is pressed with selected asset', () => {
    const mockNavigation = {
      push: jest.fn(),
      navigate: jest.fn(),
    };

    const { getByTestId } = renderWithProvider(
      <SearchTokenAutocomplete
        navigation={mockNavigation}
        tabLabel={''}
        selectedChainId={'0x1'}
        allTokens={mockAllTokens}
      />,
      { state: mockInitialState },
    );

    const mockAsset = {
      address: '0x123',
      symbol: 'TEST',
      name: 'Test Token',
      decimals: 18,
      chainId: '0x1',
    };

    const assetSearch = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);

    fireEvent(assetSearch, 'onSearch', {
      results: [mockAsset],
      searchQuery: 'TEST',
    });

    const selectAssetButton = getByTestId(
      ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
    );
    fireEvent.press(selectAssetButton);

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

  it('disables next button when no assets are selected', () => {
    const mockNavigation = {
      push: jest.fn(),
      navigate: jest.fn(),
    };

    const { getByTestId } = renderWithProvider(
      <SearchTokenAutocomplete
        navigation={mockNavigation}
        tabLabel={''}
        selectedChainId={'0x1'}
        allTokens={mockAllTokens}
      />,
      { state: mockInitialState },
    );

    const addTokenButton = getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON);

    expect(addTokenButton).toHaveProp('disabled', true);
  });

  it('enables next button when at least one asset is selected', () => {
    const mockNavigation = {
      push: jest.fn(),
      navigate: jest.fn(),
    };

    const { getByTestId } = renderWithProvider(
      <SearchTokenAutocomplete
        navigation={mockNavigation}
        tabLabel={''}
        selectedChainId={'0x1'}
        allTokens={mockAllTokens}
      />,
      { state: mockInitialState },
    );

    const mockAsset = {
      address: '0x123',
      symbol: 'TEST',
      name: 'Test Token',
      decimals: 18,
      chainId: '0x1',
    };

    const assetSearch = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);

    fireEvent(assetSearch, 'onSearch', {
      results: [mockAsset],
      searchQuery: 'TEST',
    });

    const selectAssetButton = getByTestId(
      ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
    );
    fireEvent.press(selectAssetButton);

    const addTokenButton = getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON);

    expect(addTokenButton).toHaveProp('disabled', false);
  });

  it('renders with null selectedChainId', () => {
    const mockNavigation = {
      push: jest.fn(),
      navigate: jest.fn(),
    };

    const { getByTestId } = renderWithProvider(
      <SearchTokenAutocomplete
        navigation={mockNavigation}
        tabLabel={''}
        selectedChainId={null}
        allTokens={mockAllTokens}
      />,
      { state: mockInitialState },
    );

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR),
    ).toBeOnTheScreen();
  });

  it('tracks analytics when navigating to confirm add asset', () => {
    const mockNavigation = {
      push: jest.fn(),
      navigate: jest.fn(),
    };

    const { getByTestId } = renderWithProvider(
      <SearchTokenAutocomplete
        navigation={mockNavigation}
        tabLabel={''}
        selectedChainId={'0x1'}
        allTokens={mockAllTokens}
      />,
      { state: mockInitialState },
    );

    const mockAsset = {
      address: '0x123',
      symbol: 'TEST',
      name: 'Test Token',
      decimals: 18,
      chainId: '0x1',
    };

    const assetSearch = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);

    fireEvent(assetSearch, 'onSearch', {
      results: [mockAsset],
      searchQuery: 'TEST',
    });

    const selectAssetButton = getByTestId(
      ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
    );
    fireEvent.press(selectAssetButton);

    const addTokenButton = getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON);
    fireEvent.press(addTokenButton);

    expect(mockCreateEventBuilder).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalled();
  });
});
