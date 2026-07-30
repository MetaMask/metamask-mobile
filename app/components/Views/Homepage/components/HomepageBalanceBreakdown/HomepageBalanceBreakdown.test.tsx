import React from 'react';
import { brandColor } from '@metamask/design-tokens';
import { fireEvent, render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import HomepageBalanceBreakdown from './HomepageBalanceBreakdown';
import { HomepageBalanceBreakdownTestIds } from './HomepageBalanceBreakdown.testIds';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useBalanceBreakdown } from '../../../BalanceBreakdown/hooks/useBalanceBreakdown';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog */
import type {
  BreakdownData,
  SliceData,
  SliceKey,
} from '../../../BalanceBreakdown/types';
/* eslint-enable import-x/no-restricted-paths */
import Routes from '../../../../../constants/navigation/Routes';
import { selectEvmChainId } from '../../../../../selectors/networkController';
import { selectShouldShowWalletHomeOnboardingSteps } from '../../../../../selectors/onboarding';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { mockTheme } from '../../../../../util/theme';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../../../Wallet/WalletView.testIds';

const mockNavigate = jest.fn();
const mockNavigateToMoneyHome = jest.fn();
const mockHandleViewAllPerps = jest.fn();
const mockTrackEvent = jest.fn();
const mockBuild = jest.fn(() => ({ name: 'Balance Breakdown Slice Tapped' }));
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
}));
let mockPrivacyMode = false;
let mockIsWalletHomeOnboardingActive = false;
const mockAccountGroupBalance = jest.fn();

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

jest.mock('../../../../UI/Money/hooks/useMoneyNavigation', () => ({
  useMoneyNavigation: () => ({
    navigateToMoneyHome: mockNavigateToMoneyHome,
  }),
}));

jest.mock('../../Sections/Perpetuals/hooks/usePerpsNavigationHandlers', () => ({
  usePerpsNavigationHandlers: () => ({
    handleViewAllPerps: mockHandleViewAllPerps,
  }),
}));

jest.mock('../../../BalanceBreakdown/hooks/useBalanceBreakdown');

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
  color: 'transparent',
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
      apyPercentFormatted: '4.1%',
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
    mockPrivacyMode = false;
    mockIsWalletHomeOnboardingActive = false;
    jest.mocked(useSelector).mockImplementation((selector) => {
      if (selector === selectPrivacyMode) return mockPrivacyMode;
      if (selector === selectEvmChainId) return '0x1';
      if (selector === selectShouldShowWalletHomeOnboardingSteps) {
        return mockIsWalletHomeOnboardingActive;
      }
      return undefined;
    });
    jest.mocked(useBalanceBreakdown).mockReturnValue(breakdown);
  });

  it('renders the aggregate hero and rows in screenshot order', () => {
    const { getByTestId, getAllByRole } = render(
      <HomepageBalanceBreakdown layout="icons" />,
    );

    expect(mockAccountGroupBalance).not.toHaveBeenCalled();
    expect(getByTestId(HomepageBalanceBreakdownTestIds.HERO)).toBeOnTheScreen();
    expect(
      getAllByRole('button')
        .slice(1)
        .map((row) => row.props.testID),
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
      getByTestId(HomepageBalanceBreakdownTestIds.PERCENTAGE('money')),
    ).toHaveTextContent('20%');
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.ICON('money')).props.name,
    ).toBe('Musd');
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.ICON('tokens')).props.name,
    ).toBe('Ethereum');
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.ICON('perps')),
    ).toHaveTextContent('∞');
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.ICON('predict')).props.name,
    ).toBe('Predictions');
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.ICON('defi')),
    ).toHaveTextContent('%');
  });

  it('renders an amount-only aggregate delta without a legacy percentage', () => {
    jest.mocked(useBalanceBreakdown).mockReturnValue({
      ...breakdown,
      hero: {
        ...breakdown.hero,
        delta: { amount: 2 },
      },
    });

    const { getByTestId, queryByTestId } = render(
      <HomepageBalanceBreakdown layout="icons" />,
    );

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

    const { getByTestId } = render(<HomepageBalanceBreakdown layout="icons" />);

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

    const { getByTestId, queryByTestId } = render(
      <HomepageBalanceBreakdown layout="icons" />,
    );

    expect(
      getByTestId(WalletViewSelectorsIDs.BALANCE_EMPTY_STATE_CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(HomepageBalanceBreakdownTestIds.HERO),
    ).not.toBeOnTheScreen();
  });

  it('renders allocation segments and colored row dots', () => {
    jest.mocked(useBalanceBreakdown).mockReturnValue({
      ...breakdown,
      slices: {
        ...breakdown.slices,
        tokens: makeSlice('tokens', { color: brandColor.blue700 }),
      },
    });

    const { getByTestId } = render(
      <HomepageBalanceBreakdown layout="allocation" />,
    );

    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.ALLOCATION_TITLE),
    ).toHaveTextContent('Allocation');
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.ALLOCATION_SEGMENT('tokens')),
    ).toHaveStyle({
      backgroundColor: brandColor.blue700,
      borderRadius: 999,
    });
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.DOT('tokens')),
    ).toHaveStyle({ backgroundColor: brandColor.blue700 });
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.PERCENTAGE('tokens')),
    ).toHaveTextContent('20%');
    expect(getByTestId(HomepageBalanceBreakdownTestIds.APY)).toHaveTextContent(
      '4.1% APY',
    );
  });

  it('uses alternative text color for a ready zero balance', () => {
    jest.mocked(useBalanceBreakdown).mockReturnValue({
      ...breakdown,
      slices: {
        ...breakdown.slices,
        tokens: makeSlice('tokens', {
          valueFiat: 0,
          percentOfTotal: 0,
        }),
      },
    });

    const { getByTestId } = render(<HomepageBalanceBreakdown layout="icons" />);

    const value = getByTestId(HomepageBalanceBreakdownTestIds.VALUE('tokens'));
    expect(value).toHaveTextContent('USD 0.00');
    expect(value).toHaveStyle({ color: mockTheme.colors.text.alternative });
  });

  it('renders less than one percent for a non-zero rounded allocation', () => {
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

    const { getByTestId } = render(
      <HomepageBalanceBreakdown layout="allocation" />,
    );

    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.PERCENTAGE('tokens')),
    ).toHaveTextContent('<1%');
  });

  it('renders the Money APY loading slot', () => {
    jest.mocked(useBalanceBreakdown).mockReturnValue({
      ...breakdown,
      slices: {
        ...breakdown.slices,
        money: makeSlice('money', {
          apyLoading: true,
          apyPercentFormatted: undefined,
        }),
      },
    });

    const { getByTestId, queryByTestId } = render(
      <HomepageBalanceBreakdown layout="allocation" />,
    );

    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.APY_SKELETON),
    ).toBeOnTheScreen();
    expect(queryByTestId(HomepageBalanceBreakdownTestIds.APY)).toBeNull();
  });

  it('keeps the category dot when its allocation segment is zero', () => {
    jest.mocked(useBalanceBreakdown).mockReturnValue({
      ...breakdown,
      slices: {
        ...breakdown.slices,
        tokens: makeSlice('tokens', { percentOfTotal: 0 }),
      },
    });

    const { queryByTestId } = render(
      <HomepageBalanceBreakdown layout="allocation" />,
    );

    expect(
      queryByTestId(
        HomepageBalanceBreakdownTestIds.ALLOCATION_SEGMENT('tokens'),
      ),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(HomepageBalanceBreakdownTestIds.DOT('tokens')),
    ).toBeOnTheScreen();
  });

  it('opens the canonical primitive destinations from each row', () => {
    const { getByTestId } = render(<HomepageBalanceBreakdown layout="icons" />);

    fireEvent.press(getByTestId(HomepageBalanceBreakdownTestIds.ROW('money')));
    fireEvent.press(getByTestId(HomepageBalanceBreakdownTestIds.ROW('tokens')));
    fireEvent.press(getByTestId(HomepageBalanceBreakdownTestIds.ROW('perps')));
    fireEvent.press(
      getByTestId(HomepageBalanceBreakdownTestIds.ROW('predict')),
    );
    fireEvent.press(getByTestId(HomepageBalanceBreakdownTestIds.ROW('defi')));

    expect(mockNavigateToMoneyHome).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenNthCalledWith(
      1,
      Routes.WALLET.TOKENS_FULL_VIEW,
    );
    expect(mockHandleViewAllPerps).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenNthCalledWith(2, Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: 'homepage_balance',
      },
    });
    expect(mockNavigate).toHaveBeenNthCalledWith(
      3,
      Routes.WALLET.DEFI_FULL_VIEW,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(5);
    expect(mockAddProperties).toHaveBeenNthCalledWith(1, {
      slice: 'money',
      source: 'homepage',
    });
  });

  it('renders skeletons while loading and em dashes for failed rows', () => {
    jest.mocked(useBalanceBreakdown).mockReturnValue({
      ...breakdown,
      slices: {
        ...breakdown.slices,
        money: makeSlice('money', { status: 'loading' }),
        tokens: makeSlice('tokens', { status: 'error' }),
        defi: makeSlice('defi', { status: 'ineligible' }),
      },
    });

    const { getByTestId } = render(<HomepageBalanceBreakdown layout="icons" />);

    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.SKELETON('money')).props
        .accessibilityState,
    ).toEqual({ busy: true });
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.VALUE('tokens')),
    ).toHaveTextContent('—');
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.VALUE('defi')),
    ).toHaveTextContent('—');
  });

  it('keeps fiat and PnL values privacy-sensitive', () => {
    mockPrivacyMode = true;

    const { queryByText } = render(<HomepageBalanceBreakdown layout="icons" />);

    expect(queryByText('USD 20.00')).not.toBeOnTheScreen();
    expect(queryByText('20%')).not.toBeOnTheScreen();
  });

  it('does not render rows during the onboarding checklist flow', () => {
    mockIsWalletHomeOnboardingActive = true;

    const { queryByTestId } = render(
      <HomepageBalanceBreakdown
        hideRows
        accountGroupBalanceProps={{}}
        layout="icons"
      />,
    );

    expect(
      queryByTestId(HomepageBalanceBreakdownTestIds.ROWS),
    ).not.toBeOnTheScreen();
    expect(queryByTestId('aggregate-hero')).toBeOnTheScreen();
    expect(mockAccountGroupBalance).toHaveBeenCalledWith({});
  });

  it('keeps the experiment hero when rows are hidden outside onboarding', () => {
    const { getByTestId, queryByTestId } = render(
      <HomepageBalanceBreakdown hideRows layout="icons" />,
    );

    expect(getByTestId(HomepageBalanceBreakdownTestIds.HERO)).toBeOnTheScreen();
    expect(
      queryByTestId(HomepageBalanceBreakdownTestIds.ROWS),
    ).not.toBeOnTheScreen();
    expect(mockAccountGroupBalance).not.toHaveBeenCalled();
  });
});
