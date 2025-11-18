import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PredictActivityDetail from './PredictActivityDetail';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictActivityType, type PredictActivityItem } from '../../types';
import {
  formatPositionSize,
  formatPrice,
  formatCurrencyValue,
} from '../../utils/format';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'predict.transactions.buy_title': 'Buy',
      'predict.transactions.sell_title': 'Sell',
      'predict.transactions.claim_title': 'Claim',
      'predict.transactions.activity_details': 'Activity details',
      'predict.transactions.date': 'Date',
      'predict.transactions.price_per_share': 'Price per share',
      'predict.transactions.shares_bought': 'Shares bought',
      'predict.transactions.shares_sold': 'Shares sold',
      'predict.transactions.predicted_amount': 'Predicted amount',
      'predict.transactions.price_impact': 'Price impact',
      'predict.transactions.net_pnl': 'Net PnL',
      'predict.transactions.total_net_pnl': 'Total net PnL',
      'predict.transactions.market_net_pnl': 'Market net PnL',
      'predict.transactions.not_available': 'Not available',
      back: 'Back',
    };
    return map[key] ?? key;
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (..._args: unknown[]) => ({}),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'Box',
  BoxFlexDirection: { Row: 'row' },
  BoxAlignItems: { Center: 'center' },
  BoxJustifyContent: { Between: 'between' },
}));

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const ReactActual = jest.requireActual('react');
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: React.ComponentProps<typeof RNText>) =>
      ReactActual.createElement(RNText, props, props.children),
    TextVariant: {
      HeadingMD: 'HeadingMD',
      HeadingLG: 'HeadingLG',
      BodyMD: 'BodyMD',
    },
    TextColor: {
      Default: 'Default',
      Alternative: 'Alternative',
      Success: 'Success',
      Error: 'Error',
    },
  };
});

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const ReactActual = jest.requireActual('react');
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ name }: { name: string }) =>
      ReactActual.createElement(RNText, null, `Icon:${name}`),
    IconName: { ArrowLeft: 'ArrowLeft' },
    IconSize: { Md: 'Md' },
  };
});

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({ colors: { icon: { default: '#000' } } }),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: (
      props: React.ComponentProps<typeof View> & { children?: React.ReactNode },
    ) => ReactActual.createElement(View, props, props.children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockCanGoBack = jest.fn(() => true);

const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    canGoBack: mockCanGoBack,
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => mockUseRoute(),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      trackActivityViewed: jest.fn(),
    },
  },
}));

const baseBuyActivity: PredictActivityItem = {
  id: '1',
  type: PredictActivityType.BUY,
  marketTitle: 'Market X',
  detail: '',
  amountUsd: 123.45,
  outcome: 'Yes',
  entry: {
    type: 'buy',
    timestamp: 0,
    marketId: 'm',
    outcomeId: 'o',
    outcomeTokenId: 0,
    amount: 123.45,
    price: 0.34,
  },
};

const renderWithActivity = (overrides?: Partial<PredictActivityItem>) => {
  const activity: PredictActivityItem = {
    ...baseBuyActivity,
    ...overrides,
    entry: {
      ...baseBuyActivity.entry,
      ...(overrides?.entry ?? {}),
    } as PredictActivityItem['entry'],
  };

  mockUseRoute.mockReturnValue({ params: { activity } });

  render(<PredictActivityDetail />);

  return activity;
};

describe('PredictActivityDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders BUY details: header, market info, predicted amount, shares, price and price impact; no amount badge', () => {
    const activity = renderWithActivity({
      type: PredictActivityType.BUY,
      priceImpactPercentage: 1.5,
    });

    expect(screen.getByText('Buy')).toBeOnTheScreen();

    expect(screen.getByText('Date')).toBeOnTheScreen();
    expect(screen.getByText('Not available')).toBeOnTheScreen();
    expect(screen.getByText('Market')).toBeOnTheScreen();
    expect(screen.getByText(activity.marketTitle)).toBeOnTheScreen();
    expect(screen.getByText('Outcome')).toBeOnTheScreen();
    const outcomeBuy = activity.outcome as string;
    expect(screen.getByText(outcomeBuy)).toBeOnTheScreen();

    const buyEntry = activity.entry as Extract<
      PredictActivityItem['entry'],
      { type: 'buy' }
    >;
    const expectedPredictedAmount = formatCurrencyValue(buyEntry.amount, {
      showSign: false,
    }) as string;
    const expectedShares = formatPositionSize(buyEntry.amount / buyEntry.price);
    const expectedPricePerShare = formatPrice(buyEntry.price, {
      minimumDecimals: buyEntry.price >= 1 ? 2 : 4,
      maximumDecimals: buyEntry.price >= 1 ? 2 : 4,
    });

    expect(screen.getByText('Predicted amount')).toBeOnTheScreen();
    expect(screen.getByText(expectedPredictedAmount)).toBeOnTheScreen();

    expect(screen.getByText('Shares bought')).toBeOnTheScreen();
    expect(screen.getByText(expectedShares)).toBeOnTheScreen();

    expect(screen.getByText('Price per share')).toBeOnTheScreen();
    expect(screen.getByText(expectedPricePerShare)).toBeOnTheScreen();

    expect(screen.getByText('Price impact')).toBeOnTheScreen();
    expect(screen.getByText('1.5%')).toBeOnTheScreen();

    expect(screen.queryByLabelText('USDC')).toBeNull();
  });

  it('renders SELL details with amount badge, shares sold, price per share and net pnl; excludes predicted amount and price impact', () => {
    const activity = renderWithActivity({
      type: PredictActivityType.SELL,
      amountUsd: 50,
      netPnlUsd: -10,
      entry: {
        type: 'sell',
        timestamp: 0,
        marketId: 'm',
        outcomeId: 'o',
        outcomeTokenId: 0,
        amount: 50,
        price: 0.5,
      },
    });

    expect(screen.getByText('Sell')).toBeOnTheScreen();
    expect(screen.getByLabelText('USDC')).toBeOnTheScreen();
    const amountSellText = formatCurrencyValue(activity.amountUsd) as string;
    expect(screen.getByText(amountSellText)).toBeOnTheScreen();
    const sellEntry = activity.entry as Extract<
      PredictActivityItem['entry'],
      { type: 'sell' }
    >;
    const expectedShares = formatPositionSize(
      sellEntry.amount / sellEntry.price,
    );
    const expectedPricePerShare = formatPrice(sellEntry.price, {
      minimumDecimals: 4,
      maximumDecimals: 4,
    });
    expect(screen.getByText('Shares sold')).toBeOnTheScreen();
    expect(screen.getByText(expectedShares)).toBeOnTheScreen();
    expect(screen.getByText('Price per share')).toBeOnTheScreen();
    expect(screen.getByText(expectedPricePerShare)).toBeOnTheScreen();
    expect(screen.getByText('Net PnL')).toBeOnTheScreen();
    expect(screen.getByText('-$10')).toBeOnTheScreen();
    expect(screen.queryByText('Predicted amount')).toBeNull();
    expect(screen.queryByText('Price impact')).toBeNull();
  });

  it('renders CLAIM details: amount badge and pnl rows; omits market/outcome rows', () => {
    renderWithActivity({
      type: PredictActivityType.CLAIM,
      amountUsd: 200,
      totalNetPnlUsd: 150,
      netPnlUsd: 120,
      entry: {
        type: 'claimWinnings',
        timestamp: 0,
        amount: 200,
      },
    });

    expect(screen.getByText('Claim')).toBeOnTheScreen();
    expect(screen.getByLabelText('USDC')).toBeOnTheScreen();
    expect(screen.getByText('$200')).toBeOnTheScreen();
    expect(screen.getByText('Total net PnL')).toBeOnTheScreen();
    expect(screen.getByText('+$150')).toBeOnTheScreen();
    expect(screen.getByText('Market X')).toBeOnTheScreen();
    expect(screen.getByText('+$120')).toBeOnTheScreen();
    expect(screen.queryByText('Market')).toBeNull();
    expect(screen.queryByText('Outcome')).toBeNull();
  });

  it('navigates back via goBack when possible, otherwise navigates to ROOT', () => {
    renderWithActivity();

    mockCanGoBack.mockReturnValueOnce(true);
    fireEvent.press(screen.getByText('Icon:ArrowLeft'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    mockCanGoBack.mockReturnValueOnce(false);
    fireEvent.press(screen.getByText('Icon:ArrowLeft'));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT);
  });
});
