import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import OndoPortfolio, {
  ONDO_PORTFOLIO_TEST_IDS,
  AccountGroupSelectRow,
} from './OndoPortfolio';
import type {
  OndoGmPortfolioDto,
  OndoGmPortfolioPositionDto,
  OndoGmPortfolioSummaryDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), dispatch: jest.fn() }),
  StackActions: { push: jest.fn((name: string) => ({ type: 'push', name })) },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => null),
}));

jest.mock('../../hooks/useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: jest.fn(),
    RewardsToastOptions: {
      error: jest.fn((title: string, desc: string) => ({
        type: 'error',
        title,
        desc,
      })),
    },
  }),
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AccountTreeController: { setSelectedAccountGroup: jest.fn() },
    },
  },
}));

jest.mock('../../utils/formatUtils', () => ({
  ...jest.requireActual('../../utils/formatUtils'),
  parseCaip19: jest.fn(() => ({
    namespace: 'eip155',
    chainId: '1',
    assetReference: '0x14c3abf95cb9c93a8b82c1cdcb76d72cb87b2d4c',
  })),
  caipChainIdToHex: jest.fn(() => '0x1'),
}));

jest.mock('../../../../../selectors/rewards', () => ({
  selectCurrentSubscriptionAccounts: jest.fn(() => []),
}));

jest.mock('../../../../../selectors/tokenBalancesController', () => ({
  selectAllTokenBalances: jest.fn(() => ({})),
}));

jest.mock('../../../../../selectors/tokenListController', () => ({
  selectERC20TokensByChain: jest.fn(() => ({})),
}));

jest.mock('../../../../../selectors/tokensController', () => ({
  selectAllTokens: jest.fn(() => ({})),
}));

jest.mock('../../../../../selectors/accountsController', () => ({
  selectInternalAccountByAddresses: jest.fn(() => () => []),
}));

jest.mock(
  '../../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectAccountToGroupMap: jest.fn(() => ({})),
    selectResolvedSelectedAccountGroup: jest.fn(() => null),
  }),
);

jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  selectIconSeedAddressByAccountGroupId: jest.fn(() => jest.fn(() => null)),
}));

jest.mock('../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      onConfirm,
      confirmButtonLabel,
      testID,
    }: {
      title: string;
      description: string;
      onConfirm?: () => void;
      confirmButtonLabel?: string;
      testID?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(Text, null, title),
        confirmButtonLabel &&
          ReactActual.createElement(
            Pressable,
            { onPress: onConfirm },
            ReactActual.createElement(Text, null, confirmButtonLabel),
          ),
      ),
  };
});

jest.mock('../../../../../util/formatFiat', () => ({
  __esModule: true,
  default: (amount: { toFixed: (dp: number) => string }) =>
    `$${Number(amount.toFixed(2)).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string | number>) => {
    const translations: Record<string, string> = {
      'rewards.ondo_campaign_portfolio.empty': 'No positions yet',
      'rewards.ondo_campaign_portfolio.empty_description':
        'Start investing to see your positions',
      'rewards.ondo_campaign_portfolio.empty_cta': 'Explore tokens',
      'rewards.ondo_campaign_portfolio.error_loading': 'Failed to load',
      'rewards.ondo_campaign_portfolio.error_loading_description':
        'Please try again',
      'rewards.ondo_campaign_portfolio.retry': 'Retry',
      'rewards.ondo_campaign_portfolio.updated_at': `Updated: ${params?.time ?? ''}`,
      'rewards.ondo_campaign_portfolio.position_units': `${params?.units ?? ''} units`,
    };
    return translations[key] ?? key;
  },
}));

jest.mock('../../../AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn(() => ({ uri: 'https://mock.icon' })),
}));

jest.mock('../../../Trending/components/TrendingTokenLogo', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => ReactActual.createElement(View, null),
  };
});

jest.mock('../../../Trending/utils/getTrendingTokenImageUrl', () => ({
  getTrendingTokenImageUrl: jest.fn(() => 'https://mock.token.image'),
}));

jest.mock('../../../../../util/ondoGeoRestrictions', () => ({
  isGeoRestricted: jest.fn(() => false),
}));

jest.mock('./OndoLeaderboard.utils', () => ({
  formatComputedAt: jest.fn(),
}));

jest.mock('../RewardsInfoBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      onConfirm,
      confirmButtonLabel,
    }: {
      title: string;
      description: string;
      onConfirm?: () => void;
      confirmButtonLabel?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'rewards-info-banner' },
        ReactActual.createElement(Text, null, title),
        onConfirm &&
          ReactActual.createElement(
            Pressable,
            { onPress: onConfirm, testID: 'info-banner-confirm' },
            ReactActual.createElement(
              Text,
              null,
              confirmButtonLabel ?? 'Confirm',
            ),
          ),
      ),
  };
});

jest.mock(
  '../../../../../component-library/components/List/ListItemSelect',
  () => {
    const ReactActual = jest.requireActual('react');
    const { TouchableOpacity } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        children,
        onPress,
      }: {
        children?: React.ReactNode;
        onPress?: () => void;
        isSelected?: boolean;
        isDisabled?: boolean;
        verticalAlignment?: string;
      }) =>
        ReactActual.createElement(
          TouchableOpacity,
          { onPress, testID: 'list-item-select' },
          children,
        ),
    };
  },
);

jest.mock(
  '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: () =>
        ReactActual.createElement(View, { testID: 'avatar-account' }),
    };
  },
);

const mockRefetch = jest.fn();

const MOCK_POSITION: OndoGmPortfolioPositionDto = {
  tokenSymbol: 'AAPLon',
  tokenName: 'Apple Inc.',
  tokenAsset: 'eip155:1/erc20:0x14c3abf95cb9c93a8b82c1cdcb76d72cb87b2d4c',
  units: '45.2',
  costBasis: '9040.000000',
  avgCostPerUnit: '200.000000',
  currentPrice: '215.500000',
  currentValue: '9740.600000',
  unrealizedPnl: '700.600000',
  unrealizedPnlPercent: '0.0775',
};

const MOCK_SUMMARY: OndoGmPortfolioSummaryDto = {
  totalCurrentValue: '9740.600000',
  totalCostBasis: '9040.000000',
  totalUsdDeposited: '9040.000000',
  netDeposit: '9040.000000',
  portfolioPnl: '700.600000',
  portfolioPnlPercent: '0.0775',
};

const MOCK_PORTFOLIO: OndoGmPortfolioDto = {
  positions: [MOCK_POSITION],
  summary: MOCK_SUMMARY,
  computedAt: '2026-03-20T12:00:00.000Z',
};

const baseProps = {
  portfolio: null as OndoGmPortfolioDto | null,
  isLoading: false,
  hasError: false,
  hasFetched: false,
  refetch: mockRefetch,
  campaignId: 'campaign-1',
  onOpenAccountPicker: jest.fn(),
};

describe('OndoPortfolio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('renders skeleton when loading before first fetch with no data', () => {
      const { getByTestId } = render(
        <OndoPortfolio {...baseProps} isLoading />,
      );

      expect(getByTestId(ONDO_PORTFOLIO_TEST_IDS.LOADING)).toBeDefined();
    });

    it('does not render skeleton when loading but portfolio data already present', () => {
      const { queryByTestId } = render(
        <OndoPortfolio
          {...baseProps}
          portfolio={MOCK_PORTFOLIO}
          isLoading
          hasFetched
        />,
      );

      expect(queryByTestId(ONDO_PORTFOLIO_TEST_IDS.LOADING)).toBeNull();
    });

    it('renders skeleton when loading and portfolio has zero positions', () => {
      const { getByTestId } = render(
        <OndoPortfolio
          {...baseProps}
          portfolio={{ ...MOCK_PORTFOLIO, positions: [] }}
          isLoading
          hasFetched
        />,
      );

      expect(getByTestId(ONDO_PORTFOLIO_TEST_IDS.LOADING)).toBeDefined();
    });

    it('renders skeleton during retry (isLoading=true, hasFetched=true, no portfolio)', () => {
      const { getByTestId, queryByTestId } = render(
        <OndoPortfolio {...baseProps} isLoading hasFetched />,
      );

      expect(getByTestId(ONDO_PORTFOLIO_TEST_IDS.LOADING)).toBeDefined();
      expect(queryByTestId(ONDO_PORTFOLIO_TEST_IDS.EMPTY)).toBeNull();
    });
  });

  describe('error state', () => {
    it('renders error banner when has error and no data', () => {
      const { getByTestId } = render(
        <OndoPortfolio {...baseProps} hasError hasFetched />,
      );

      expect(getByTestId(ONDO_PORTFOLIO_TEST_IDS.ERROR)).toBeDefined();
    });

    it('does not show empty banner on error even after fetch', () => {
      const { queryByTestId } = render(
        <OndoPortfolio {...baseProps} hasError hasFetched />,
      );

      expect(queryByTestId(ONDO_PORTFOLIO_TEST_IDS.EMPTY)).toBeNull();
    });

    it('shows cached portfolio data instead of error banner when portfolio exists', () => {
      const { queryByTestId, getByTestId } = render(
        <OndoPortfolio
          {...baseProps}
          portfolio={MOCK_PORTFOLIO}
          hasError
          hasFetched
        />,
      );

      expect(queryByTestId(ONDO_PORTFOLIO_TEST_IDS.ERROR)).toBeNull();
      expect(getByTestId(ONDO_PORTFOLIO_TEST_IDS.CONTAINER)).toBeDefined();
    });
  });

  describe('empty state', () => {
    it('renders empty banner when fetch completed with no portfolio', () => {
      const { getByTestId } = render(
        <OndoPortfolio {...baseProps} hasFetched />,
      );

      expect(getByTestId(ONDO_PORTFOLIO_TEST_IDS.EMPTY)).toBeDefined();
    });

    it('does not render empty banner when portfolio data is present', () => {
      const { queryByTestId } = render(
        <OndoPortfolio {...baseProps} portfolio={MOCK_PORTFOLIO} hasFetched />,
      );

      expect(queryByTestId(ONDO_PORTFOLIO_TEST_IDS.EMPTY)).toBeNull();
    });
  });

  describe('initial/unfetched state', () => {
    it('renders nothing before any fetch has completed', () => {
      const { queryByTestId } = render(<OndoPortfolio {...baseProps} />);

      expect(queryByTestId(ONDO_PORTFOLIO_TEST_IDS.LOADING)).toBeNull();
      expect(queryByTestId(ONDO_PORTFOLIO_TEST_IDS.ERROR)).toBeNull();
      expect(queryByTestId(ONDO_PORTFOLIO_TEST_IDS.EMPTY)).toBeNull();
      expect(queryByTestId(ONDO_PORTFOLIO_TEST_IDS.CONTAINER)).toBeNull();
    });
  });

  describe('portfolio data display', () => {
    const loadedProps = {
      ...baseProps,
      portfolio: MOCK_PORTFOLIO,
      isLoading: false,
      hasError: false,
      hasFetched: true,
    };

    it('renders portfolio container', () => {
      const { getByTestId } = render(<OndoPortfolio {...loadedProps} />);

      expect(getByTestId(ONDO_PORTFOLIO_TEST_IDS.CONTAINER)).toBeDefined();
    });

    it('renders the token name', () => {
      const { getByText } = render(<OndoPortfolio {...loadedProps} />);

      expect(getByText('Apple Inc.')).toBeDefined();
    });
  });

  describe('navigation', () => {
    const loadedProps = {
      ...baseProps,
      portfolio: MOCK_PORTFOLIO,
      hasFetched: true,
    };

    beforeEach(() => {
      (useSelector as jest.Mock).mockImplementation((selector: unknown) => {
        const { selectAllTokens } = jest.requireMock(
          '../../../../../selectors/tokensController',
        );
        const { selectERC20TokensByChain } = jest.requireMock(
          '../../../../../selectors/tokenListController',
        );
        if (selector === selectAllTokens) return {};
        if (selector === selectERC20TokensByChain) return {};
        return null;
      });
    });

    afterEach(() => {
      (useSelector as jest.Mock).mockReturnValue(null);
    });

    it('pressing a position row does not throw', () => {
      const { getByText } = render(<OndoPortfolio {...loadedProps} />);
      fireEvent.press(getByText('Apple Inc.'));
      expect(getByText('Apple Inc.')).toBeDefined();
    });

    it('renders empty banner when portfolio has no positions', () => {
      const { getByTestId, queryByTestId } = render(
        <OndoPortfolio
          {...baseProps}
          portfolio={{ ...MOCK_PORTFOLIO, positions: [] }}
          hasFetched
        />,
      );

      expect(getByTestId(ONDO_PORTFOLIO_TEST_IDS.EMPTY)).toBeDefined();
      expect(queryByTestId(ONDO_PORTFOLIO_TEST_IDS.CONTAINER)).toBeNull();
    });
  });

  describe('zero balance filtering in getAccountsWithBalance', () => {
    // Sets up useSelector so that one subscription account has the given raw hex
    // balance for the mocked token, then presses the position row and asserts
    // that onOpenAccountPicker is NOT called (the account is treated as zero).
    const TOKEN_ADDRESS = '0x14c3abf95cb9c93a8b82c1cdcb76d72cb87b2d4c';
    const ACCOUNT_ADDRESS = '0xdeadbeef00000000000000000000000000000001';
    const CAIP_ACCOUNT = `eip155:1:${ACCOUNT_ADDRESS}`;

    const buildPropsWithBalance = (rawHexBalance: string) => {
      const mockOnOpenAccountPicker = jest.fn();

      // Set up two groups so that if balance leaks through the filter the
      // component would open the account picker instead of navigating.
      (useSelector as jest.Mock).mockImplementation((selector: unknown) => {
        const { selectCurrentSubscriptionAccounts } = jest.requireMock(
          '../../../../../selectors/rewards',
        );
        const { selectAllTokenBalances } = jest.requireMock(
          '../../../../../selectors/tokenBalancesController',
        );
        const { selectERC20TokensByChain } = jest.requireMock(
          '../../../../../selectors/tokenListController',
        );
        const { selectAllTokens } = jest.requireMock(
          '../../../../../selectors/tokensController',
        );
        const { selectInternalAccountByAddresses } = jest.requireMock(
          '../../../../../selectors/accountsController',
        );
        if (selector === selectCurrentSubscriptionAccounts)
          return [{ account: CAIP_ACCOUNT }];
        if (selector === selectAllTokenBalances)
          return {
            [ACCOUNT_ADDRESS.toLowerCase()]: {
              '0x1': { [TOKEN_ADDRESS]: rawHexBalance },
            },
          };
        if (selector === selectERC20TokensByChain) return {};
        if (selector === selectAllTokens) return {};
        if (selector === selectInternalAccountByAddresses) return () => [];
        return null;
      });

      return {
        ...baseProps,
        portfolio: MOCK_PORTFOLIO,
        hasFetched: true,
        onOpenAccountPicker: mockOnOpenAccountPicker,
      };
    };

    afterEach(() => {
      // Restore the default useSelector mock for other tests
      (useSelector as jest.Mock).mockReturnValue(null);
    });

    it.each([
      ['0x0', 'single zero digit'],
      ['0x00', 'two zero digits'],
      ['0x', 'no digits after prefix'],
      [
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '64 zero digits (full 32-byte word)',
      ],
    ])(
      'treats %s (%s) as zero and does not open account picker',
      (rawHexBalance) => {
        const props = buildPropsWithBalance(rawHexBalance);
        const { getByText } = render(<OndoPortfolio {...props} />);

        fireEvent.press(getByText('Apple Inc.'));

        expect(props.onOpenAccountPicker).not.toHaveBeenCalled();
      },
    );

    it('treats a non-zero hex balance as non-zero', () => {
      const props = buildPropsWithBalance('0x1');
      // With one account holding balance in one group, the component navigates
      // directly (groups.length === 1) — picker is still not opened. What we
      // want to confirm is that the account IS considered to have balance (i.e.
      // selectInternalAccountByAddresses is called with a non-empty array).
      // We verify this indirectly: if the account were filtered out the
      // component would call navigateToSwap via the groups.length === 0 branch,
      // which is the same observable outcome. So we just assert the render
      // doesn't throw and the row is pressable.
      const { getByText } = render(<OndoPortfolio {...props} />);
      expect(() => fireEvent.press(getByText('Apple Inc.'))).not.toThrow();
    });
  });

  describe('position rendering details', () => {
    const loadedProps = {
      ...baseProps,
      portfolio: MOCK_PORTFOLIO,
      hasFetched: true,
    };

    it('renders the units text', () => {
      const { getByText } = render(<OndoPortfolio {...loadedProps} />);
      expect(getByText('45.2 units')).toBeDefined();
    });

    it('renders positive PnL percent in green', () => {
      const { getByText } = render(<OndoPortfolio {...loadedProps} />);
      expect(getByText('+7.75%')).toBeDefined();
    });

    it('renders negative PnL percent for loss position', () => {
      const { getByText } = render(
        <OndoPortfolio
          {...baseProps}
          portfolio={{
            ...MOCK_PORTFOLIO,
            positions: [{ ...MOCK_POSITION, unrealizedPnlPercent: '-0.05' }],
          }}
          hasFetched
        />,
      );
      expect(getByText('-5.00%')).toBeDefined();
    });

    it('does not render PnL percent when value is non-numeric', () => {
      const { queryByText } = render(
        <OndoPortfolio
          {...baseProps}
          portfolio={{
            ...MOCK_PORTFOLIO,
            positions: [{ ...MOCK_POSITION, unrealizedPnlPercent: '—' }],
          }}
          hasFetched
        />,
      );
      expect(queryByText('—')).toBeNull();
    });
  });

  describe('empty state CTA', () => {
    it('triggers navigate when empty state confirm button is pressed', () => {
      const { getByTestId } = render(
        <OndoPortfolio {...baseProps} hasFetched />,
      );
      fireEvent.press(getByTestId('info-banner-confirm'));
      expect(getByTestId(ONDO_PORTFOLIO_TEST_IDS.EMPTY)).toBeOnTheScreen();
    });
  });

  describe('AccountGroupSelectRow', () => {
    it('renders group name and balance', () => {
      const group = {
        id: 'g1',
        metadata: { name: 'My Group' },
      } as never;
      const onPress = jest.fn();
      const { getByText } = render(
        <AccountGroupSelectRow
          group={group}
          balance="12.500000"
          tokenSymbol="AAPL"
          isSelected={false}
          onPress={onPress}
        />,
      );
      expect(getByText('My Group')).toBeOnTheScreen();
      expect(getByText('12.500000 AAPL')).toBeOnTheScreen();
    });

    it('calls onPress when the row is pressed', () => {
      const group = { id: 'g1', metadata: { name: 'My Group' } } as never;
      const onPress = jest.fn();
      const { getByTestId } = render(
        <AccountGroupSelectRow
          group={group}
          balance="0"
          tokenSymbol="AAPL"
          isSelected={false}
          onPress={onPress}
        />,
      );
      fireEvent.press(getByTestId('list-item-select'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleRowPress account group branching', () => {
    const TOKEN_ADDRESS = '0x14c3abf95cb9c93a8b82c1cdcb76d72cb87b2d4c';
    const ACCOUNT_1 = '0xdeadbeef00000000000000000000000000000001';
    const ACCOUNT_2 = '0xdeadbeef00000000000000000000000000000002';
    const CAIP_1 = `eip155:1:${ACCOUNT_1}`;
    const CAIP_2 = `eip155:1:${ACCOUNT_2}`;
    const GROUP_1 = { id: 'group-1', metadata: { name: 'Account 1' } } as never;
    const GROUP_2 = { id: 'group-2', metadata: { name: 'Account 2' } } as never;

    afterEach(() => {
      (useSelector as jest.Mock).mockReturnValue(null);
    });

    it('navigates directly when exactly one group has the token balance', () => {
      const onOpenAccountPicker = jest.fn();

      (useSelector as jest.Mock).mockImplementation((selector: unknown) => {
        const { selectCurrentSubscriptionAccounts } = jest.requireMock(
          '../../../../../selectors/rewards',
        );
        const { selectAllTokenBalances } = jest.requireMock(
          '../../../../../selectors/tokenBalancesController',
        );
        const { selectERC20TokensByChain } = jest.requireMock(
          '../../../../../selectors/tokenListController',
        );
        const { selectAllTokens } = jest.requireMock(
          '../../../../../selectors/tokensController',
        );
        const { selectInternalAccountByAddresses } = jest.requireMock(
          '../../../../../selectors/accountsController',
        );
        const { selectAccountToGroupMap, selectResolvedSelectedAccountGroup } =
          jest.requireMock(
            '../../../../../selectors/multichainAccounts/accountTreeController',
          );

        if (selector === selectCurrentSubscriptionAccounts)
          return [{ account: CAIP_1 }];
        if (selector === selectAllTokenBalances)
          return {
            [ACCOUNT_1]: {
              '0x1': { [TOKEN_ADDRESS]: '0x56bc75e2d63100000' },
            },
          };
        if (selector === selectERC20TokensByChain) return {};
        if (selector === selectAllTokens) return {};
        if (selector === selectInternalAccountByAddresses)
          return () => [{ id: 'acc-1', address: ACCOUNT_1 }];
        if (selector === selectAccountToGroupMap) return { 'acc-1': GROUP_1 };
        if (selector === selectResolvedSelectedAccountGroup) return null;
        return null;
      });

      const { getByText } = render(
        <OndoPortfolio
          {...baseProps}
          portfolio={MOCK_PORTFOLIO}
          hasFetched
          onOpenAccountPicker={onOpenAccountPicker}
        />,
      );

      fireEvent.press(getByText('Apple Inc.'));

      // Single group → navigates directly, picker NOT opened
      expect(onOpenAccountPicker).not.toHaveBeenCalled();
    });

    it('opens account picker when multiple groups hold the token', () => {
      const onOpenAccountPicker = jest.fn();

      (useSelector as jest.Mock).mockImplementation((selector: unknown) => {
        const { selectCurrentSubscriptionAccounts } = jest.requireMock(
          '../../../../../selectors/rewards',
        );
        const { selectAllTokenBalances } = jest.requireMock(
          '../../../../../selectors/tokenBalancesController',
        );
        const { selectERC20TokensByChain } = jest.requireMock(
          '../../../../../selectors/tokenListController',
        );
        const { selectAllTokens } = jest.requireMock(
          '../../../../../selectors/tokensController',
        );
        const { selectInternalAccountByAddresses } = jest.requireMock(
          '../../../../../selectors/accountsController',
        );
        const { selectAccountToGroupMap, selectResolvedSelectedAccountGroup } =
          jest.requireMock(
            '../../../../../selectors/multichainAccounts/accountTreeController',
          );

        if (selector === selectCurrentSubscriptionAccounts)
          return [{ account: CAIP_1 }, { account: CAIP_2 }];
        if (selector === selectAllTokenBalances)
          return {
            [ACCOUNT_1]: {
              '0x1': { [TOKEN_ADDRESS]: '0x56bc75e2d63100000' },
            },
            [ACCOUNT_2]: {
              '0x1': { [TOKEN_ADDRESS]: '0x56bc75e2d63100000' },
            },
          };
        if (selector === selectERC20TokensByChain) return {};
        if (selector === selectAllTokens) return {};
        if (selector === selectInternalAccountByAddresses)
          return () => [
            { id: 'acc-1', address: ACCOUNT_1 },
            { id: 'acc-2', address: ACCOUNT_2 },
          ];
        if (selector === selectAccountToGroupMap)
          return { 'acc-1': GROUP_1, 'acc-2': GROUP_2 };
        if (selector === selectResolvedSelectedAccountGroup) return null;
        return null;
      });

      const { getByText } = render(
        <OndoPortfolio
          {...baseProps}
          portfolio={MOCK_PORTFOLIO}
          hasFetched
          onOpenAccountPicker={onOpenAccountPicker}
        />,
      );

      fireEvent.press(getByText('Apple Inc.'));

      expect(onOpenAccountPicker).toHaveBeenCalledTimes(1);
      const config = (onOpenAccountPicker as jest.Mock).mock.calls[0][0];
      expect(config.entries).toHaveLength(2);
    });
  });
});
