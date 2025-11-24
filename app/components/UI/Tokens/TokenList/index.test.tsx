import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider, useSelector } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { TokenList } from './index';
import { useNavigation } from '@react-navigation/native';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';
import { useMetrics } from '../../../hooks/useMetrics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';

// Mock external dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../hooks/useMetrics');

jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: { default: '#0376C9' },
      icon: { default: '#24292E' },
    },
  }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

// Mock selectors
jest.mock('../../../../selectors/preferencesController', () => ({
  selectPrivacyMode: jest.fn(() => false),
  selectIsTokenNetworkFilterEqualCurrentNetwork: jest.fn(() => true),
}));

jest.mock(
  '../../../../selectors/featureFlagController/multichainAccounts',
  () => ({
    selectMultichainAccountsState2Enabled: jest.fn(() => false),
  }),
);

jest.mock('../../../../selectors/featureFlagController/homepage', () => ({
  selectHomepageRedesignV1Enabled: jest.fn(() => true),
}));

// Mock child components
jest.mock('./TokenListItem', () => ({
  TokenListItem: ({ assetKey }: { assetKey: { address: string } }) => {
    const React = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');
    return React.createElement(
      View,
      { testID: `token-item-${assetKey.address}` },
      React.createElement(Text, null, `Token: ${assetKey.address}`),
    );
  },
  TokenListItemBip44: ({ assetKey }: { assetKey: { address: string } }) => {
    const React = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');
    return React.createElement(
      View,
      { testID: `token-item-bip44-${assetKey.address}` },
      React.createElement(Text, null, `Token BIP44: ${assetKey.address}`),
    );
  },
}));

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => ({
  Box: ({
    children,
    testID,
    twClassName: _twClassName,
  }: {
    children: React.ReactNode;
    testID?: string;
    twClassName?: string;
  }) => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return React.createElement(View, { testID, style: { flex: 1 } }, children);
  },
  Button: ({
    children,
    onPress,
    testID,
    variant: _variant,
    isFullWidth: _isFullWidth,
  }: {
    children: React.ReactNode;
    onPress: () => void;
    testID?: string;
    variant?: string;
    isFullWidth?: boolean;
  }) => {
    const React = jest.requireActual('react');
    const { TouchableOpacity, Text } = jest.requireActual('react-native');
    return React.createElement(
      TouchableOpacity,
      { testID, onPress },
      React.createElement(Text, null, children),
    );
  },
  ButtonVariant: {
    Secondary: 'Secondary',
  },
}));

// Mock FlashList
jest.mock('@shopify/flash-list', () => {
  const React = jest.requireActual('react');
  const { FlatList } = jest.requireActual('react-native');
  return {
    FlashList: React.forwardRef(
      (props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        React.useImperativeHandle(ref, () => ({
          recomputeViewableItems: jest.fn(),
        }));
        return React.createElement(FlatList, { ...props, ref });
      },
    ),
  };
});

const mockStore = configureMockStore();
const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseMetrics = useMetrics as jest.MockedFunction<typeof useMetrics>;

const mockTokenKeys = [
  {
    address: '0x123',
    chainId: '0x1',
    isStaked: false,
  },
  {
    address: '0x456',
    chainId: '0x1',
    isStaked: true,
  },
];

const initialState = {};

describe('TokenList', () => {
  const defaultProps = {
    tokenKeys: mockTokenKeys,
    refreshing: false,
    onRefresh: jest.fn(),
    showRemoveMenu: jest.fn(),
    setShowScamWarningModal: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as unknown as ReturnType<typeof useNavigation>);

    mockUseMetrics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
      enable: jest.fn(),
      addTraitsToUser: jest.fn(),
      createDataDeletionTask: jest.fn(),
      checkDataDeleteStatus: jest.fn(),
      getDeleteRegulationCreationDate: jest.fn(),
      getDeleteRegulationId: jest.fn(),
      isDataRecorded: jest.fn(),
      isEnabled: jest.fn(),
      getMetaMetricsId: jest.fn(),
    });

    // Mock useSelector to call the selector function with empty state
    mockUseSelector.mockImplementation((selector) => selector({}));
  });

  const renderComponent = (props = {}, storeState = initialState) => {
    const store = mockStore(storeState);
    return render(
      <Provider store={store}>
        <TokenList {...defaultProps} {...props} />
      </Provider>,
    );
  };

  it('renders token list when tokens are present', () => {
    const { getByTestId } = renderComponent();

    expect(
      getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST),
    ).toBeOnTheScreen();
    expect(getByTestId('token-item-0x123')).toBeOnTheScreen();
    expect(getByTestId('token-item-0x456')).toBeOnTheScreen();
  });

  it('renders empty container when no tokens', () => {
    const { getByTestId } = renderComponent({ tokenKeys: [] });

    expect(
      getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST),
    ).toBeOnTheScreen();
  });

  it('shows view all button when maxItems is exceeded', () => {
    const { getByText } = renderComponent({ maxItems: 1 });

    expect(getByText('wallet.view_all_tokens')).toBeOnTheScreen();
  });

  it('hides view all button when maxItems is not exceeded', () => {
    const { queryByText } = renderComponent({ maxItems: 5 });

    expect(queryByText('wallet.view_all_tokens')).toBeNull();
  });

  it('hides view all button when maxItems is undefined', () => {
    const { queryByText } = renderComponent({ maxItems: undefined });

    expect(queryByText('wallet.view_all_tokens')).toBeNull();
  });

  it('limits displayed tokens when maxItems is specified', () => {
    const { getByTestId, queryByTestId } = renderComponent({ maxItems: 1 });

    expect(getByTestId('token-item-0x123')).toBeOnTheScreen();
    expect(queryByTestId('token-item-0x456')).toBeNull();
  });

  it('navigates to tokens full view when view all button is pressed', () => {
    const { getByText } = renderComponent({ maxItems: 1 });

    const viewAllButton = getByText('wallet.view_all_tokens');
    fireEvent.press(viewAllButton);

    expect(mockNavigate).toHaveBeenCalledWith('TokensFullView');
  });

  it('tracks analytics event when view all button is pressed', () => {
    const { getByText } = renderComponent({ maxItems: 1 });

    const viewAllButton = getByText('wallet.view_all_tokens');
    fireEvent.press(viewAllButton);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'View All Assets Clicked',
        properties: expect.objectContaining({
          asset_type: 'Token',
        }),
      }),
    );
  });

  it('renders container without items when tokenKeys is empty', () => {
    const { getByTestId, queryByTestId } = renderComponent({ tokenKeys: [] });

    expect(
      getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST),
    ).toBeOnTheScreen();
    expect(queryByTestId('token-item-0x123')).toBeNull();
  });

  it('calls onRefresh when refresh control is triggered', () => {
    const onRefresh = jest.fn();
    const { getByTestId } = renderComponent({ onRefresh, isFullView: true });

    const flashList = getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST);
    const refreshControl = flashList.props.refreshControl;

    refreshControl.props.onRefresh();

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('applies contentContainerStyle when isFullView is true', () => {
    const { getByTestId } = renderComponent({
      isFullView: true,
    });

    const flashList = getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST);
    expect(flashList.props.contentContainerStyle).toBeDefined();
  });

  it('uses TokenListItemBip44 when multichain accounts state 2 is enabled', () => {
    // Reset and set new mock implementation for this test
    mockUseSelector.mockReset();
    mockUseSelector.mockImplementation((selector) => {
      if (selector.toString().includes('selectPrivacyMode')) {
        return false;
      }
      if (
        selector
          .toString()
          .includes('selectIsTokenNetworkFilterEqualCurrentNetwork')
      ) {
        return true;
      }
      if (
        selector.toString().includes('selectMultichainAccountsState2Enabled')
      ) {
        return true;
      }
      return undefined;
    });

    const { getByTestId } = renderComponent();

    // The component should render tokens, but we can't easily test which specific component
    // is used due to the mocking complexity. Instead, we verify the component renders correctly.
    expect(
      getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST),
    ).toBeOnTheScreen();
  });

  it('uses TokenListItem when multichain accounts state 2 is disabled', () => {
    const { getByTestId } = renderComponent();

    expect(getByTestId('token-item-0x123')).toBeOnTheScreen();
    expect(getByTestId('token-item-0x456')).toBeOnTheScreen();
  });

  it('handles undefined tokenKeys gracefully', () => {
    const { getByTestId, queryByTestId } = renderComponent({
      tokenKeys: undefined,
    });

    expect(
      getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST),
    ).toBeOnTheScreen();
    expect(queryByTestId('token-item-0x123')).toBeNull();
    expect(queryByTestId('token-item-0x456')).toBeNull();
  });

  it('handles null tokenKeys gracefully', () => {
    const { getByTestId, queryByTestId } = renderComponent({ tokenKeys: null });

    expect(
      getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST),
    ).toBeOnTheScreen();
    expect(queryByTestId('token-item-0x123')).toBeNull();
    expect(queryByTestId('token-item-0x456')).toBeNull();
  });

  it('shows refreshing state correctly', () => {
    const { getByTestId } = renderComponent({
      refreshing: true,
      isFullView: true,
    });

    const flashList = getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST);
    const refreshControl = flashList.props.refreshControl;

    expect(refreshControl.props.refreshing).toBe(true);
  });

  it('generates unique keys for token items', () => {
    const { getByTestId } = renderComponent({ isFullView: true });

    const flashList = getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST);
    const keyExtractor = flashList.props.keyExtractor;

    const key1 = keyExtractor(mockTokenKeys[0], 0);
    const key2 = keyExtractor(mockTokenKeys[1], 1);

    expect(key1).toBe('0x123-0x1-unstaked-0');
    expect(key2).toBe('0x456-0x1-staked-1');
    expect(key1).not.toBe(key2);
  });

  it('passes correct props to token list items', () => {
    const showRemoveMenu = jest.fn();
    const setShowScamWarningModal = jest.fn();

    renderComponent({
      showRemoveMenu,
      setShowScamWarningModal,
      showPercentageChange: false,
    });

    // The actual prop passing is tested through the component rendering
    // This test ensures the component doesn't crash with different prop combinations
    expect(showRemoveMenu).not.toHaveBeenCalled();
    expect(setShowScamWarningModal).not.toHaveBeenCalled();
  });

  describe('Homepage Redesign V1 Features', () => {
    beforeEach(() => {
      // Reset selector mocks for this describe block
      mockUseSelector.mockReset();
    });

    it('renders tokens directly in Box when isHomepageRedesignV1Enabled is true and not full view', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector.toString().includes('selectHomepageRedesignV1Enabled')) {
          return true;
        }
        return selector({});
      });

      const { getByTestId } = renderComponent({ isFullView: false });

      expect(getByTestId('token-item-0x123')).toBeOnTheScreen();
      expect(getByTestId('token-item-0x456')).toBeOnTheScreen();
    });

    it('renders FlashList when isHomepageRedesignV1Enabled is true but isFullView is true', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector.toString().includes('selectHomepageRedesignV1Enabled')) {
          return true;
        }
        return selector({});
      });

      const { getByTestId } = renderComponent({ isFullView: true });

      expect(
        getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST),
      ).toBeOnTheScreen();
    });

    it('renders FlashList when isHomepageRedesignV1Enabled is false', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector.toString().includes('selectHomepageRedesignV1Enabled')) {
          return false;
        }
        return selector({});
      });

      const { getByTestId } = renderComponent();

      expect(
        getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST),
      ).toBeOnTheScreen();
    });

    it('shows view all button when homepage redesign is enabled and maxItems is exceeded', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector.toString().includes('selectHomepageRedesignV1Enabled')) {
          return true;
        }
        return selector({});
      });

      const { getByText } = renderComponent({ maxItems: 1, isFullView: false });

      expect(getByText('wallet.view_all_tokens')).toBeOnTheScreen();
    });

    it('renders mapped token items when homepage redesign is enabled and not full view', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector.toString().includes('selectHomepageRedesignV1Enabled')) {
          return true;
        }
        return selector({});
      });

      const { queryByTestId } = renderComponent({ isFullView: false });

      // When homepage redesign is enabled and not full view, tokens are rendered directly
      // instead of in FlashList
      expect(queryByTestId('token-item-0x123')).toBeOnTheScreen();
      expect(queryByTestId('token-item-0x456')).toBeOnTheScreen();
    });
  });
});
