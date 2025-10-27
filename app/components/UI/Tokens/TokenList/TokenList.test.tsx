import React from 'react';
import { waitFor } from '@testing-library/react-native';
import { TokenList } from './TokenList';
import { FlashListAssetKey } from './TokenList.types';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';

// Mock external dependencies that are not under test
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => (className: string) => ({ className }),
}));

jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: { default: '#037DD6' },
      icon: { default: '#037DD6' },
    },
  }),
}));

jest.mock('../../../../selectors/preferencesController', () => ({
  selectIsTokenNetworkFilterEqualCurrentNetwork: jest.fn(() => true),
  selectPrivacyMode: jest.fn(() => false),
}));

jest.mock(
  '../../../../selectors/featureFlagController/multichainAccounts',
  () => ({
    selectMultichainAccountsState2Enabled: jest.fn(() => false),
  }),
);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

// Mock child components to avoid complex Redux state setup
jest.mock('./TokenListItem', () => ({
  TokenListItem: ({ assetKey }: { assetKey: FlashListAssetKey }) => {
    const React = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');

    return React.createElement(
      View,
      { testID: `token-item-${assetKey.address}` },
      React.createElement(Text, null, `Token ${assetKey.address}`),
    );
  },
  TokenListItemBip44: ({ assetKey }: { assetKey: FlashListAssetKey }) => {
    const React = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');

    return React.createElement(
      View,
      { testID: `token-item-bip44-${assetKey.address}` },
      React.createElement(Text, null, `Token BIP44 ${assetKey.address}`),
    );
  },
}));

// Mock the styles module
jest.mock('../styles', () => ({
  __esModule: true,
  default: () => ({
    emptyView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyTokensView: { alignItems: 'center' },
    emptyTokensViewText: { fontSize: 16, marginBottom: 8 },
  }),
}));

// Type the mocked function
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

const mockTokenKeys: FlashListAssetKey[] = [
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

const mockProps = {
  tokenKeys: mockTokenKeys,
  refreshing: false,
  onRefresh: jest.fn(),
  showRemoveMenu: jest.fn(),
  showPercentageChange: true,
  setShowScamWarningModal: jest.fn(),
  flashListProps: {},
  maxItems: undefined as number | undefined,
};

// Simple render function without Redux store
const renderComponent = (props = mockProps) => {
  const React = jest.requireActual('react');
  const { render } = jest.requireActual('@testing-library/react-native');

  return render(<TokenList {...props} />);
};

describe('TokenList', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default navigation mock
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as unknown as ReturnType<typeof useNavigation>);
  });

  it('renders token list when tokens are available', () => {
    const { getByTestId } = renderComponent();

    expect(
      getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST),
    ).toBeOnTheScreen();
  });

  it('renders empty state when no tokens are available', () => {
    const propsWithNoTokens = {
      ...mockProps,
      tokenKeys: [],
    };

    const { getByText } = renderComponent(propsWithNoTokens);

    expect(getByText(strings('wallet.no_tokens'))).toBeOnTheScreen();
    expect(
      getByText(strings('wallet.show_tokens_without_balance')),
    ).toBeOnTheScreen();
  });

  it('renders empty state when tokenKeys is undefined', () => {
    const propsWithUndefinedTokens = {
      ...mockProps,
      tokenKeys: undefined as unknown as FlashListAssetKey[],
    };

    const { getByText } = renderComponent(propsWithUndefinedTokens);

    expect(getByText(strings('wallet.no_tokens'))).toBeOnTheScreen();
    expect(
      getByText(strings('wallet.show_tokens_without_balance')),
    ).toBeOnTheScreen();
  });

  it('calls onRefresh when refresh control is triggered', async () => {
    const mockOnRefresh = jest.fn();
    const propsWithRefresh = {
      ...mockProps,
      refreshing: true,
      onRefresh: mockOnRefresh,
    };

    const { getByTestId } = renderComponent(propsWithRefresh);

    const refreshControl = getByTestId(
      WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST,
    );

    await waitFor(async () => {
      await refreshControl.props.refreshControl.props.onRefresh();
    });

    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders with correct key extractor for tokens', () => {
    const { getByTestId } = renderComponent();

    const flashList = getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST);

    const key1 = flashList.props.keyExtractor(mockTokenKeys[0], 0);
    const key2 = flashList.props.keyExtractor(mockTokenKeys[1], 1);

    expect(key1).toBe('0x123-0x1-unstaked-0');
    expect(key2).toBe('0x456-0x1-staked-1');
  });

  it('passes correct props to TokenListItem components', () => {
    const { getByTestId } = renderComponent();

    const flashList = getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST);

    const renderedItem = flashList.props.renderItem({ item: mockTokenKeys[0] });

    expect(renderedItem).toBeDefined();
  });

  it('handles showPercentageChange prop correctly', () => {
    const propsWithoutPercentageChange = {
      ...mockProps,
      showPercentageChange: false,
    };

    const { getByTestId } = renderComponent(propsWithoutPercentageChange);

    expect(
      getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST),
    ).toBeOnTheScreen();
  });

  it('applies custom flashListProps when provided', () => {
    const customFlashListProps = {
      estimatedItemSize: 100,
      scrollEnabled: false,
    };

    const propsWithCustomFlashListProps = {
      ...mockProps,
      flashListProps: customFlashListProps,
    };

    const { getByTestId } = renderComponent(propsWithCustomFlashListProps);

    const flashList = getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST);

    expect(flashList.props.estimatedItemSize).toBe(100);
    expect(flashList.props.scrollEnabled).toBe(false);
  });

  it('handles empty state link press', () => {
    const propsWithNoTokens = {
      ...mockProps,
      tokenKeys: [],
    };

    const { getByText } = renderComponent(propsWithNoTokens);

    const linkText = getByText(strings('wallet.show_tokens_without_balance'));

    expect(linkText.props.onPress).toBeDefined();
  });

  it('renders with correct viewability configuration', () => {
    const { getByTestId } = renderComponent();

    const flashList = getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST);

    expect(flashList.props.viewabilityConfig).toEqual({
      itemVisiblePercentThreshold: 50,
      minimumViewTime: 1000,
    });
  });

  it('renders with correct deceleration rate', () => {
    const { getByTestId } = renderComponent();

    const flashList = getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST);

    expect(flashList.props.decelerationRate).toBe('fast');
  });

  it('renders with correct extraData', () => {
    const { getByTestId } = renderComponent();

    const flashList = getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST);

    expect(flashList.props.extraData).toEqual({
      isTokenNetworkFilterEqualCurrentNetwork: true,
    });
  });

  describe('maxItems functionality', () => {
    it('displays all items when maxItems is undefined', () => {
      const propsWithUndefinedMaxItems = {
        ...mockProps,
        maxItems: undefined,
      };

      const { getByTestId } = renderComponent(propsWithUndefinedMaxItems);

      const flashList = getByTestId(
        WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST,
      );

      expect(flashList.props.data).toHaveLength(2);
      expect(flashList.props.data).toEqual(mockTokenKeys);
    });

    it('displays limited items when maxItems is defined', () => {
      const propsWithMaxItems = {
        ...mockProps,
        maxItems: 1,
      };

      const { getByTestId } = renderComponent(propsWithMaxItems);

      const flashList = getByTestId(
        WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST,
      );

      expect(flashList.props.data).toHaveLength(1);
      expect(flashList.props.data).toEqual([mockTokenKeys[0]]);
    });

    it('displays empty state when maxItems is 0', () => {
      const propsWithZeroMaxItems = {
        ...mockProps,
        maxItems: 0,
      };

      const { getByText } = renderComponent(propsWithZeroMaxItems);

      expect(getByText(strings('wallet.no_tokens'))).toBeOnTheScreen();
      expect(
        getByText(strings('wallet.show_tokens_without_balance')),
      ).toBeOnTheScreen();
    });

    it('displays all items when maxItems exceeds available items', () => {
      const propsWithLargeMaxItems = {
        ...mockProps,
        maxItems: 10,
      };

      const { getByTestId } = renderComponent(propsWithLargeMaxItems);

      const flashList = getByTestId(
        WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST,
      );

      expect(flashList.props.data).toHaveLength(2);
      expect(flashList.props.data).toEqual(mockTokenKeys);
    });
  });

  describe('View all tokens button', () => {
    it('shows button when maxItems is set and there are more items', () => {
      const propsWithMaxItems = {
        ...mockProps,
        maxItems: 1,
      };

      const { getByText } = renderComponent(propsWithMaxItems);

      expect(getByText(strings('wallet.view_all_tokens'))).toBeOnTheScreen();
    });

    it('does not show button when maxItems is undefined', () => {
      const propsWithUndefinedMaxItems = {
        ...mockProps,
        maxItems: undefined,
      };

      const { queryByText } = renderComponent(propsWithUndefinedMaxItems);

      expect(
        queryByText(strings('wallet.view_all_tokens')),
      ).not.toBeOnTheScreen();
    });

    it('does not show button when items do not exceed maxItems', () => {
      const propsWithLargeMaxItems = {
        ...mockProps,
        maxItems: 10,
      };

      const { queryByText } = renderComponent(propsWithLargeMaxItems);

      expect(
        queryByText(strings('wallet.view_all_tokens')),
      ).not.toBeOnTheScreen();
    });

    it('navigates to tokens full view when button is pressed', () => {
      const propsWithMaxItems = {
        ...mockProps,
        maxItems: 1,
      };

      const { getByText } = renderComponent(propsWithMaxItems);

      const button = getByText(strings('wallet.view_all_tokens'));
      button.props.onPress();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.TOKENS_FULL_VIEW);
    });
  });
});
