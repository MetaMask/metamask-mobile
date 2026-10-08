import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import I18n from '../../../../../../locales/i18n';
import HomepageBalanceBreakdown from './HomepageBalanceBreakdown';
import { HomepageBalanceBreakdownTestIds } from './HomepageBalanceBreakdown.testIds';
import { useBalanceBreakdown } from '../../BalanceBreakdown/hooks/useBalanceBreakdown';
import type {
  BreakdownData,
  SliceData,
  SliceKey,
} from '../../BalanceBreakdown/types';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { selectAccountGroupBalanceForEmptyState } from '../../../../../selectors/assets/balances';
import { selectEvmChainId } from '../../../../../selectors/networkController';
import { selectShouldShowWalletHomeOnboardingSteps } from '../../../../../selectors/onboarding';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { selectIsMoneyAccountGeoEligible } from '../../../../UI/Money/selectors/eligibility';
import { mockTheme } from '../../../../../util/theme';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../../../Wallet/WalletView.testIds';
import { createActiveABTestAssignment } from '../../../../../util/analytics/activeABTestAssignments';

const mockNavigate = jest.fn();
const mockNavigateToMoneyHome = jest.fn();
const mockInitiateMoneyDeposit = jest.fn();
const mockTrackMoneyButtonClicked = jest.fn();
const mockNavigateToPerpsHome = jest.fn();
const mockUsePerpsNavigationHandlers = jest.fn((_options?: unknown) => ({
  navigateToPerpsHome: mockNavigateToPerpsHome,
}));
const mockTrackEvent = jest.fn();
const mockBuild = jest.fn(() => ({ name: 'Home Viewed' }));
const mockAddProperties = jest.fn((_properties?: Record<string, unknown>) => ({
  build: mockBuild,
}));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
}));
let mockPrivacyMode = false;
let mockIsWalletHomeOnboardingActive = false;
let mockIsMoneyAccountGeoEligible = true;
const mockAccountGroupBalance = jest.fn();
const originalLocale = I18n.locale;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../hooks/useFormatters', () => ({
  useFormatters: () => ({
    formatCurrency: (value: number, currency: string) =>
      `${currency.toUpperCase()} ${value.toFixed(2)}`,
  }),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../context/HomepageScrollContext', () => ({
  useHomepageScrollContext: () => ({
    entryPoint: 'home_tab',
    appSessionId: 'app-session-id',
    visitId: 2,
  }),
}));

jest.mock('../../../../UI/Money/hooks/useMoneyNavigation', () => ({
  useMoneyNavigation: () => ({
    navigateToMoneyHome: mockNavigateToMoneyHome,
  }),
}));

jest.mock('../../../../UI/Money/hooks/useMoneyAccount', () => ({
  useMoneyAccountDeposit: () => ({
    initiateDeposit: mockInitiateMoneyDeposit,
  }),
}));

jest.mock('../../../../UI/Money/hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: () => ({
    trackButtonClicked: mockTrackMoneyButtonClicked,
  }),
}));

jest.mock('../../Sections/Perpetuals/hooks/usePerpsNavigationHandlers', () => ({
  usePerpsNavigationHandlers: (options: unknown) =>
    mockUsePerpsNavigationHandlers(options),
}));

jest.mock('../../BalanceBreakdown/hooks/useBalanceBreakdown');

jest.mock(
  '../../../../UI/Assets/components/Balance/AccountGroupBalance',
  () => {
    const ReactMock = jest.requireActual('react');
    const { Pressable } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: (props: object) => {
        mockAccountGroupBalance(props);
        return ReactMock.createElement(Pressable, {
          accessibilityRole: 'button',
          testID: 'aggregate-hero',
        });
      },
    };
  },
);

jest.mock('../../../../UI/BalanceEmptyState', () => {
  const ReactMock = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return ({ testID }: { testID?: string }) =>
    ReactMock.createElement(View, { testID });
});

jest.mock('../../../../../component-library/components-temp/Skeleton', () => {
  const ReactMock = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    Skeleton: ({
      children,
      hideChildren,
      testID,
    }: {
      children: React.ReactNode;
      hideChildren: boolean;
      testID?: string;
    }) =>
      ReactMock.createElement(
        View,
        { testID, accessibilityState: { busy: hideChildren } },
        children,
      ),
  };
});

const makeSlice = (
  key: SliceKey,
  overrides: Partial<SliceData> = {},
): SliceData => ({
  key,
  isVisible: true,
  valueFiat: 10,
  percentOfTotal: 0.2,
  status: 'ready',
  ...overrides,
});

const breakdown: BreakdownData = {
  hero: {
    totalFiat: 50,
    userCurrency: 'USD',
    status: 'ready',
    delta: { amount: 2, percent: 0.04 },
  },
  slices: {
    money: makeSlice('money', {
      apyPercent: 4.1,
    }),
    tokens: makeSlice('tokens', { valueFiat: 20 }),
    perps: makeSlice('perps'),
    predict: makeSlice('predict'),
    defi: makeSlice('defi'),
  },
};

describe('HomepageBalanceBreakdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitiateMoneyDeposit.mockResolvedValue(undefined);
    I18n.locale = 'en-US';
    mockPrivacyMode = false;
    mockIsWalletHomeOnboardingActive = false;
    mockIsMoneyAccountGeoEligible = true;
    jest.mocked(useSelector).mockImplementation((selector) => {
      if (selector === selectPrivacyMode) return mockPrivacyMode;
      if (selector === selectIsMoneyAccountGeoEligible) {
        return mockIsMoneyAccountGeoEligible;
      }
      if (selector === selectEvmChainId) return '0x1';
      if (selector === selectAccountGroupBalanceForEmptyState) {
        return { totalBalanceInUserCurrency: 0 };
      }
      if (selector === selectShouldShowWalletHomeOnboardingSteps) {
        return mockIsWalletHomeOnboardingActive;
      }
      return undefined;
    });
    jest.mocked(useBalanceBreakdown).mockReturnValue(breakdown);
  });

  afterAll(() => {
    I18n.locale = originalLocale;
  });

  it('renders the aggregate hero and iconless rows in screenshot order', () => {
    const { getByTestId, getAllByTestId, queryByTestId } = render(
      <HomepageBalanceBreakdown />,
    );

    expect(mockAccountGroupBalance).not.toHaveBeenCalled();
    expect(getByTestId(HomepageBalanceBreakdownTestIds.HERO)).toHaveStyle({
      alignItems: 'flex-start',
      backgroundColor: 'transparent',
      flexDirection: 'column',
    });
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.HERO_CONTENT),
    ).toHaveStyle({
      alignItems: 'flex-start',
      flexDirection: 'column',
      gap: 4,
    });
    expect(
      getAllByTestId(/^homepage-balance-breakdown-row-/).map(
        (row) => row.props.testID,
      ),
    ).toEqual([
      HomepageBalanceBreakdownTestIds.ROW('money'),
      HomepageBalanceBreakdownTestIds.ROW('tokens'),
      HomepageBalanceBreakdownTestIds.ROW('perps'),
      HomepageBalanceBreakdownTestIds.ROW('predict'),
      HomepageBalanceBreakdownTestIds.ROW('defi'),
    ]);
    expect(getByTestId(HomepageBalanceBreakdownTestIds.APY)).toHaveTextContent(
      '4.1% APY',
    );
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.ROW('money')).props
        .accessibilityLabel,
    ).toBe('Money, 20%, 4.1% APY');
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.MONEY_BUY).props.accessible,
    ).toBe(true);
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.MONEY_BUY).props
        .accessibilityLabel,
    ).toBe('Money, 20%, 4.1% APY, Buy');
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.PERCENTAGE('money')),
    ).toHaveTextContent('20%');
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.VALUE_UNDERLINE('tokens')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.MONEY_BUY),
    ).toHaveTextContent('Buy');
    expect(
      queryByTestId(HomepageBalanceBreakdownTestIds.VALUE('money')),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.HERO).props
        .accessibilityLabel,
    ).toContain('USD 50.00');
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.HERO).props.accessibilityHint,
    ).toBe('Hide total balance');
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.ROW('tokens')).props
        .accessibilityLabel,
    ).toBe('Tokens, USD 20.00, 20%');
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.ROW('tokens')),
    ).toHaveStyle({
      minHeight: 40,
      paddingBottom: 0,
      paddingTop: 0,
    });
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.ROW('perps')).props
        .accessibilityLabel,
    ).toBe('Perps, USD 10.00, 20%');
  });

  it('localizes balance percentages and APY numbers', () => {
    I18n.locale = 'de-DE';

    const { getByTestId } = render(<HomepageBalanceBreakdown />);

    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.PERCENTAGE('money')),
    ).toHaveTextContent('20 %');
    expect(getByTestId(HomepageBalanceBreakdownTestIds.APY)).toHaveTextContent(
      'APY von 4,1 %',
    );
  });

  it('omits slices hidden by their product flags', () => {
    jest.mocked(useBalanceBreakdown).mockReturnValue({
      ...breakdown,
      slices: {
        ...breakdown.slices,
        money: makeSlice('money', {
          isVisible: false,
          status: 'ineligible',
        }),
        predict: makeSlice('predict', {
          isVisible: false,
          status: 'ineligible',
        }),
      },
    });

    const { queryByTestId } = render(<HomepageBalanceBreakdown />);

    expect(
      queryByTestId(HomepageBalanceBreakdownTestIds.ROW('predict')),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(HomepageBalanceBreakdownTestIds.ROW('money')),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(HomepageBalanceBreakdownTestIds.MONEY_BUY),
    ).not.toBeOnTheScreen();
  });

  it('renders an amount-only aggregate delta without a legacy percentage', () => {
    jest.mocked(useBalanceBreakdown).mockReturnValue({
      ...breakdown,
      hero: {
        ...breakdown.hero,
        delta: { amount: 2 },
      },
    });

    const { getByTestId, queryByTestId } = render(<HomepageBalanceBreakdown />);

    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.HERO_DELTA_AMOUNT),
    ).toHaveStyle({ color: mockTheme.colors.success.default });
    expect(
      queryByTestId(HomepageBalanceBreakdownTestIds.HERO_DELTA_PERCENT),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.HERO_PERIOD),
    ).toHaveTextContent('Today');
  });

  it('mutes a partially loaded aggregate hero', () => {
    jest.mocked(useBalanceBreakdown).mockReturnValue({
      ...breakdown,
      hero: {
        ...breakdown.hero,
        isPartiallyLoaded: true,
      },
    });

    const { getByTestId } = render(<HomepageBalanceBreakdown />);

    expect(getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT)).toHaveStyle({
      color: mockTheme.colors.text.muted,
    });
  });

  it('mutes an incomplete aggregate without treating an error as loading', () => {
    jest.mocked(useBalanceBreakdown).mockReturnValue({
      ...breakdown,
      hero: {
        ...breakdown.hero,
        hasErroredSlice: true,
        isPartiallyLoaded: false,
      },
    });

    const { getByTestId } = render(<HomepageBalanceBreakdown />);

    expect(getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT)).toHaveStyle({
      color: mockTheme.colors.text.muted,
    });
  });

  it('renders the experiment empty state for a settled zero portfolio', () => {
    jest.mocked(useBalanceBreakdown).mockReturnValue({
      ...breakdown,
      hero: {
        ...breakdown.hero,
        totalFiat: 0,
      },
    });

    const { getByTestId, queryByTestId } = render(<HomepageBalanceBreakdown />);

    expect(
      getByTestId(WalletViewSelectorsIDs.BALANCE_EMPTY_STATE_CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(HomepageBalanceBreakdownTestIds.HERO),
    ).not.toBeOnTheScreen();
  });

  it('hides settled rows without a balance while keeping Money visible', () => {
    jest.mocked(useBalanceBreakdown).mockReturnValue({
      ...breakdown,
      slices: {
        ...breakdown.slices,
        money: makeSlice('money', {
          valueFiat: 0,
          percentOfTotal: 0,
        }),
        tokens: makeSlice('tokens', {
          valueFiat: 0,
          percentOfTotal: 0,
        }),
      },
    });

    const { getByTestId, queryByTestId } = render(<HomepageBalanceBreakdown />);

    expect(
      queryByTestId(HomepageBalanceBreakdownTestIds.ROW('tokens')),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.ROW('money')),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(HomepageBalanceBreakdownTestIds.VALUE('money')),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.MONEY_BUY),
    ).toHaveTextContent('Buy');
    expect(getByTestId(HomepageBalanceBreakdownTestIds.MONEY_BUY)).toHaveStyle({
      borderRadius: 9999,
      height: 28,
    });
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.ROW('money')).props
        .accessibilityLabel,
    ).toBe('Money, 0%');
  });

  it('initiates a Money deposit when the Buy button is pressed', () => {
    const { getByTestId } = render(<HomepageBalanceBreakdown />);

    fireEvent.press(getByTestId(HomepageBalanceBreakdownTestIds.MONEY_BUY));

    expect(mockInitiateMoneyDeposit).toHaveBeenCalledTimes(1);
  });

  it('opens the geo-block sheet when Buy is pressed by an ineligible user', () => {
    mockIsMoneyAccountGeoEligible = false;
    const { getByTestId } = render(<HomepageBalanceBreakdown />);

    fireEvent.press(getByTestId(HomepageBalanceBreakdownTestIds.MONEY_BUY));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
    });
    expect(mockInitiateMoneyDeposit).not.toHaveBeenCalled();
  });

  it('keeps a settled non-zero debt row visible', () => {
    jest.mocked(useBalanceBreakdown).mockReturnValue({
      ...breakdown,
      slices: {
        ...breakdown.slices,
        defi: makeSlice('defi', { valueFiat: -10, percentOfTotal: 0 }),
      },
    });

    const { getByTestId } = render(<HomepageBalanceBreakdown />);

    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.ROW('defi')),
    ).toBeOnTheScreen();
  });

  it('renders less than one percent for a non-zero rounded percentage', () => {
    jest.mocked(useBalanceBreakdown).mockReturnValue({
      ...breakdown,
      slices: {
        ...breakdown.slices,
        tokens: makeSlice('tokens', {
          valueFiat: 0.01,
          percentOfTotal: 0.004,
        }),
      },
    });

    const { getByTestId } = render(<HomepageBalanceBreakdown />);

    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.PERCENTAGE('tokens')),
    ).toHaveTextContent('<1%');
  });

  it('renders less than zero for a positive fiat value that rounds to zero', () => {
    jest.mocked(useBalanceBreakdown).mockReturnValue({
      ...breakdown,
      slices: {
        ...breakdown.slices,
        tokens: makeSlice('tokens', {
          valueFiat: 0.001,
        }),
      },
    });

    const { getByTestId } = render(<HomepageBalanceBreakdown />);

    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.VALUE('tokens')),
    ).toHaveTextContent('<USD 0.00');
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.ROW('tokens')).props
        .accessibilityLabel,
    ).toContain('<USD 0.00');
  });

  it('renders the Money APY loading slot', () => {
    jest.mocked(useBalanceBreakdown).mockReturnValue({
      ...breakdown,
      slices: {
        ...breakdown.slices,
        money: makeSlice('money', {
          apyLoading: true,
          apyPercent: undefined,
        }),
      },
    });

    const { getByTestId, queryByTestId } = render(<HomepageBalanceBreakdown />);

    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.APY_SKELETON),
    ).toBeOnTheScreen();
    expect(queryByTestId(HomepageBalanceBreakdownTestIds.APY)).toBeNull();
  });

  it('opens the canonical primitive destinations from each row', () => {
    const transactionActiveAbTests = [
      createActiveABTestAssignment(
        'homeTMCU1209AbtestHomepageBalanceBreakdownV2',
        'treatment',
      ),
    ];
    const { getByTestId } = render(
      <HomepageBalanceBreakdown
        transactionActiveAbTests={transactionActiveAbTests}
      />,
    );

    fireEvent.press(getByTestId(HomepageBalanceBreakdownTestIds.ROW('money')));
    fireEvent.press(getByTestId(HomepageBalanceBreakdownTestIds.ROW('tokens')));
    fireEvent.press(getByTestId(HomepageBalanceBreakdownTestIds.ROW('perps')));
    fireEvent.press(
      getByTestId(HomepageBalanceBreakdownTestIds.ROW('predict')),
    );
    fireEvent.press(getByTestId(HomepageBalanceBreakdownTestIds.ROW('defi')));

    expect(mockNavigateToMoneyHome).toHaveBeenCalledWith(
      expect.objectContaining({
        analyticsContext: expect.objectContaining({
          attribution: 'homescreen_balance_breakdown',
          id: expect.any(String),
        }),
      }),
    );
    expect(mockNavigate).toHaveBeenNthCalledWith(
      1,
      Routes.WALLET.TOKENS_FULL_VIEW,
      {
        analyticsContext: expect.objectContaining({
          attribution: 'homescreen_balance_breakdown',
          id: expect.any(String),
        }),
      },
    );
    expect(mockUsePerpsNavigationHandlers).toHaveBeenCalledWith({
      transactionActiveAbTests,
    });
    expect(mockNavigateToPerpsHome).toHaveBeenCalledTimes(1);
    expect(mockNavigateToPerpsHome).toHaveBeenCalledWith(
      expect.objectContaining({
        attribution: 'homescreen_balance_breakdown',
        id: expect.any(String),
      }),
    );
    expect(mockNavigate).toHaveBeenNthCalledWith(2, Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: 'homescreen_balance_breakdown',
        transactionActiveAbTests,
      },
    });
    expect(mockNavigate).toHaveBeenNthCalledWith(
      3,
      Routes.WALLET.DEFI_FULL_VIEW,
      {
        analyticsContext: expect.objectContaining({
          attribution: 'homescreen_balance_breakdown',
          id: expect.any(String),
        }),
      },
    );
    expect(mockCreateEventBuilder).toHaveBeenCalledTimes(5);
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.HOME_VIEWED,
    );
    expect(mockAddProperties).toHaveBeenNthCalledWith(1, {
      interaction_type: 'balance_breakdown_row_tapped',
      location: 'home',
      section_name: 'money',
      position: 0,
      entry_point: 'home_tab',
      app_session_id: 'app-session-id',
      visit_number: 2,
    });
    expect(mockAddProperties).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        section_name: 'perpetuals',
        position: 2,
      }),
    );
    expect(mockAddProperties).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        section_name: 'predictions',
        position: 3,
      }),
    );
    expect(
      mockAddProperties.mock.calls.map(([properties = {}]) => ({
        section_name: properties.section_name,
        position: properties.position,
      })),
    ).toEqual([
      { section_name: 'money', position: 0 },
      { section_name: 'tokens', position: 1 },
      { section_name: 'perpetuals', position: 2 },
      { section_name: 'predictions', position: 3 },
      { section_name: 'defi', position: 4 },
    ]);
    expect(mockTrackEvent).toHaveBeenCalledTimes(5);
  });

  it('opens the Money geo-block sheet from the Money row when geo-ineligible', () => {
    mockIsMoneyAccountGeoEligible = false;
    const { getByTestId } = render(<HomepageBalanceBreakdown />);

    fireEvent.press(getByTestId(HomepageBalanceBreakdownTestIds.ROW('money')));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
    });
    expect(mockNavigateToMoneyHome).not.toHaveBeenCalled();
  });

  it('keeps Money Buy visible while hiding unresolved non-Money rows', () => {
    jest.mocked(useBalanceBreakdown).mockReturnValue({
      ...breakdown,
      slices: {
        ...breakdown.slices,
        money: makeSlice('money', { status: 'loading' }),
        tokens: makeSlice('tokens', { status: 'error' }),
        defi: makeSlice('defi', { status: 'ineligible' }),
      },
    });

    const { getByTestId, queryByTestId } = render(<HomepageBalanceBreakdown />);

    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.MONEY_BUY),
    ).toHaveTextContent('Buy');
    expect(
      queryByTestId(HomepageBalanceBreakdownTestIds.ROW('tokens')),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(HomepageBalanceBreakdownTestIds.ROW('defi')),
    ).not.toBeOnTheScreen();
  });

  it('keeps fiat and PnL values privacy-sensitive', () => {
    mockPrivacyMode = true;

    const { getByTestId, queryByText } = render(<HomepageBalanceBreakdown />);

    expect(queryByText('USD 20.00')).not.toBeOnTheScreen();
    expect(queryByText('20%')).not.toBeOnTheScreen();
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.HERO).props
        .accessibilityLabel,
    ).toBe('Show total balance');
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.ROW('tokens')).props
        .accessibilityLabel,
    ).toBe('Tokens');
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.ROW('money')).props
        .accessibilityLabel,
    ).toBe('Money');
  });

  it('does not render rows during the onboarding checklist flow', () => {
    mockIsWalletHomeOnboardingActive = true;

    const { queryByTestId } = render(
      <HomepageBalanceBreakdown hideRows accountGroupBalanceProps={{}} />,
    );

    expect(
      queryByTestId(HomepageBalanceBreakdownTestIds.ROWS),
    ).not.toBeOnTheScreen();
    expect(queryByTestId('aggregate-hero')).toBeOnTheScreen();
    expect(mockAccountGroupBalance).toHaveBeenCalledWith({});
  });

  it('keeps the experiment hero when rows are hidden outside onboarding', () => {
    const { getByTestId, queryByTestId } = render(
      <HomepageBalanceBreakdown hideRows />,
    );

    expect(getByTestId(HomepageBalanceBreakdownTestIds.HERO)).toBeOnTheScreen();
    expect(
      queryByTestId(HomepageBalanceBreakdownTestIds.ROWS),
    ).not.toBeOnTheScreen();
    expect(mockAccountGroupBalance).not.toHaveBeenCalled();
  });
});
