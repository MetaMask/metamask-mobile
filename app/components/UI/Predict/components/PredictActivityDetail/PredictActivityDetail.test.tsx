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

const createActivityItem = (
  overrides?: Partial<PredictActivityItem>,
): PredictActivityItem => {
  const baseEntry = {
    type: 'buy' as const,
    timestamp: 0,
    marketId: 'm',
    outcomeId: 'o',
    outcomeTokenId: 0,
    amount: 123.45,
    price: 0.34,
  };

  return {
    id: '1',
    type: PredictActivityType.BUY,
    marketTitle: 'Market X',
    detail: '',
    amountUsd: 123.45,
    outcome: 'Yes',
    entry: baseEntry,
    ...overrides,
  };
};

describe('PredictActivityDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('BUY activity', () => {
    it('displays buy title and market information', () => {
      const activity = createActivityItem({
        type: PredictActivityType.BUY,
        priceImpactPercentage: 1.5,
      });
      mockUseRoute.mockReturnValue({ params: { activity } });

      render(<PredictActivityDetail />);

      expect(screen.getByText('Buy')).toBeOnTheScreen();
      expect(screen.getByText('Date')).toBeOnTheScreen();
      expect(screen.getByText('Not available')).toBeOnTheScreen();
      expect(screen.getByText('Market')).toBeOnTheScreen();
      expect(screen.getByText('Market X')).toBeOnTheScreen();
      expect(screen.getByText('Outcome')).toBeOnTheScreen();
      expect(screen.getByText('Yes')).toBeOnTheScreen();
    });

    it('displays predicted amount with formatted value', () => {
      const activity = createActivityItem({
        type: PredictActivityType.BUY,
      });
      mockUseRoute.mockReturnValue({ params: { activity } });
      const buyEntry = activity.entry as Extract<
        PredictActivityItem['entry'],
        { type: 'buy' }
      >;
      const expectedAmount = formatCurrencyValue(buyEntry.amount, {
        showSign: false,
      }) as string;

      render(<PredictActivityDetail />);

      expect(screen.getByText('Predicted amount')).toBeOnTheScreen();
      expect(screen.getByText(expectedAmount)).toBeOnTheScreen();
    });

    it('displays shares bought with calculated value', () => {
      const activity = createActivityItem({
        type: PredictActivityType.BUY,
      });
      mockUseRoute.mockReturnValue({ params: { activity } });
      const buyEntry = activity.entry as Extract<
        PredictActivityItem['entry'],
        { type: 'buy' }
      >;
      const expectedShares = formatPositionSize(
        buyEntry.amount / buyEntry.price,
      );

      render(<PredictActivityDetail />);

      expect(screen.getByText('Shares bought')).toBeOnTheScreen();
      expect(screen.getByText(expectedShares)).toBeOnTheScreen();
    });

    it('displays price per share with formatted value', () => {
      const activity = createActivityItem({
        type: PredictActivityType.BUY,
      });
      mockUseRoute.mockReturnValue({ params: { activity } });
      const buyEntry = activity.entry as Extract<
        PredictActivityItem['entry'],
        { type: 'buy' }
      >;
      const expectedPrice = formatPrice(buyEntry.price, {
        minimumDecimals: buyEntry.price >= 1 ? 2 : 4,
        maximumDecimals: buyEntry.price >= 1 ? 2 : 4,
      });

      render(<PredictActivityDetail />);

      expect(screen.getByText('Price per share')).toBeOnTheScreen();
      expect(screen.getByText(expectedPrice)).toBeOnTheScreen();
    });

    it('displays price impact when provided', () => {
      const activity = createActivityItem({
        type: PredictActivityType.BUY,
        priceImpactPercentage: 1.5,
      });
      mockUseRoute.mockReturnValue({ params: { activity } });

      render(<PredictActivityDetail />);

      expect(screen.getByText('Price impact')).toBeOnTheScreen();
      expect(screen.getByText('1.5%')).toBeOnTheScreen();
    });

    it('hides USDC badge for buy activities', () => {
      const activity = createActivityItem({
        type: PredictActivityType.BUY,
      });
      mockUseRoute.mockReturnValue({ params: { activity } });

      render(<PredictActivityDetail />);

      expect(screen.queryByLabelText('USDC')).toBeNull();
    });
  });

  describe('SELL activity', () => {
    it('displays sell title with USDC badge and amount', () => {
      const activity = createActivityItem({
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
      mockUseRoute.mockReturnValue({ params: { activity } });
      const expectedAmount = formatCurrencyValue(activity.amountUsd) as string;

      render(<PredictActivityDetail />);

      expect(screen.getByText('Sell')).toBeOnTheScreen();
      expect(screen.getByLabelText('USDC')).toBeOnTheScreen();
      expect(screen.getByText(expectedAmount)).toBeOnTheScreen();
    });

    it('displays shares sold with price per share', () => {
      const activity = createActivityItem({
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
      mockUseRoute.mockReturnValue({ params: { activity } });
      const sellEntry = activity.entry as Extract<
        PredictActivityItem['entry'],
        { type: 'sell' }
      >;
      const expectedShares = formatPositionSize(
        sellEntry.amount / sellEntry.price,
      );
      const expectedPrice = formatPrice(sellEntry.price, {
        minimumDecimals: 4,
        maximumDecimals: 4,
      });

      render(<PredictActivityDetail />);

      expect(screen.getByText('Shares sold')).toBeOnTheScreen();
      expect(screen.getByText(expectedShares)).toBeOnTheScreen();
      expect(screen.getByText('Price per share')).toBeOnTheScreen();
      expect(screen.getByText(expectedPrice)).toBeOnTheScreen();
    });

    it('displays net PnL for sell activity', () => {
      const activity = createActivityItem({
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
      mockUseRoute.mockReturnValue({ params: { activity } });

      render(<PredictActivityDetail />);

      expect(screen.getByText('Net PnL')).toBeOnTheScreen();
      expect(screen.getByText('-$10.00')).toBeOnTheScreen();
    });

    it('hides predicted amount and price impact for sell activities', () => {
      const activity = createActivityItem({
        type: PredictActivityType.SELL,
        amountUsd: 50,
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
      mockUseRoute.mockReturnValue({ params: { activity } });

      render(<PredictActivityDetail />);

      expect(screen.queryByText('Predicted amount')).toBeNull();
      expect(screen.queryByText('Price impact')).toBeNull();
    });
  });

  describe('CLAIM activity', () => {
    it('displays claim title with USDC badge and amount', () => {
      const activity = createActivityItem({
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
      mockUseRoute.mockReturnValue({ params: { activity } });

      render(<PredictActivityDetail />);

      expect(screen.getByText('Claim')).toBeOnTheScreen();
      expect(screen.getByLabelText('USDC')).toBeOnTheScreen();
      expect(screen.getByText('$200.00')).toBeOnTheScreen();
    });

    it('displays total net PnL with market-specific PnL', () => {
      const activity = createActivityItem({
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
      mockUseRoute.mockReturnValue({ params: { activity } });

      render(<PredictActivityDetail />);

      expect(screen.getByText('Total net PnL')).toBeOnTheScreen();
      expect(screen.getByText('+$150.00')).toBeOnTheScreen();
      expect(screen.getByText('Market X')).toBeOnTheScreen();
      expect(screen.getByText('+$120.00')).toBeOnTheScreen();
    });

    it('hides market and outcome labels for claim activities', () => {
      const activity = createActivityItem({
        type: PredictActivityType.CLAIM,
        amountUsd: 200,
        entry: {
          type: 'claimWinnings',
          timestamp: 0,
          amount: 200,
        },
      });
      mockUseRoute.mockReturnValue({ params: { activity } });

      render(<PredictActivityDetail />);

      expect(screen.queryByText('Market')).toBeNull();
      expect(screen.queryByText('Outcome')).toBeNull();
    });
  });

  describe('navigation', () => {
    it('calls goBack when back button is pressed and navigation can go back', () => {
      const activity = createActivityItem();
      mockUseRoute.mockReturnValue({ params: { activity } });
      mockCanGoBack.mockReturnValue(true);

      render(<PredictActivityDetail />);
      const backButton = screen.getByTestId(
        'predict-activity-details-back-button',
      );

      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('navigates to root when back button is pressed and cannot go back', () => {
      const activity = createActivityItem();
      mockUseRoute.mockReturnValue({ params: { activity } });
      mockCanGoBack.mockReturnValue(false);

      render(<PredictActivityDetail />);
      const backButton = screen.getByTestId(
        'predict-activity-details-back-button',
      );

      fireEvent.press(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT);
    });
  });
});
