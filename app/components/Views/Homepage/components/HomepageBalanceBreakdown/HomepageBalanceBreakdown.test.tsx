import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
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
const mockAccountGroupBalance = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-redux', () => ({
  useSelector: () => mockPrivacyMode,
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
    jest.mocked(useBalanceBreakdown).mockReturnValue(breakdown);
  });

  it('renders the aggregate hero and rows in screenshot order', () => {
    const { getByTestId, getAllByRole } = render(
      <HomepageBalanceBreakdown layout="icons" />,
    );

    expect(mockAccountGroupBalance).toHaveBeenCalledWith(
      expect.objectContaining({ heroOverride: breakdown.hero }),
    );
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
  });

  it('renders chevrons without allocation dots for the arrows layout', () => {
    const { getByTestId, queryByTestId } = render(
      <HomepageBalanceBreakdown layout="arrows" />,
    );

    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.ARROW('tokens')),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(HomepageBalanceBreakdownTestIds.DOT('tokens')),
    ).not.toBeOnTheScreen();
  });

  it('renders allocation segments and colored row dots', () => {
    const { getByTestId } = render(
      <HomepageBalanceBreakdown layout="allocation" />,
    );

    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.ALLOCATION_TITLE),
    ).toHaveTextContent('Allocation');
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.ALLOCATION_SEGMENT('tokens')),
    ).toHaveStyle({ borderRadius: 999 });
    expect(
      getByTestId(HomepageBalanceBreakdownTestIds.DOT('tokens')),
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
  });

  it('does not render rows during the onboarding checklist flow', () => {
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
  });
});
