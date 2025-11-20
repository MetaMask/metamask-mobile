import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PredictActivity from './PredictActivity';
import { PredictActivityType, type PredictActivityItem } from '../../types';
import Routes from '../../../../../constants/navigation/Routes';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'predict.transactions.buy_title': 'Buy',
      'predict.transactions.sell_title': 'Sell',
      'predict.transactions.claim_title': 'Claim',
    };
    return mockStrings[key] || key;
  }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const createActivityItem = (
  overrides?: Partial<PredictActivityItem>,
): PredictActivityItem => {
  const baseEntry = {
    type: 'buy' as const,
    timestamp: 0,
    marketId: 'market-1',
    outcomeId: 'outcome-1',
    outcomeTokenId: 0,
    amount: 1234.5,
    price: 0.34,
  };

  return {
    id: '1',
    type: PredictActivityType.BUY,
    marketTitle: 'Will ETF be approved?',
    detail: '$123.45 on Yes • 34¢',
    amountUsd: 1234.5,
    percentChange: 1.5,
    icon: undefined,
    outcome: 'Yes',
    entry: baseEntry,
    ...overrides,
  };
};

describe('PredictActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('BUY activity', () => {
    it('displays buy title with market information and detail', () => {
      const item = createActivityItem();

      render(<PredictActivity item={item} />);

      expect(screen.getByText('Buy')).toBeOnTheScreen();
      expect(screen.getByText('Will ETF be approved?')).toBeOnTheScreen();
      expect(screen.getByText('-$1,234.50')).toBeOnTheScreen();
      expect(screen.getByText('1.5%')).toBeOnTheScreen();
    });

    it('displays custom icon when icon URL is provided', () => {
      const item = createActivityItem({
        icon: 'https://example.com/icon.png',
      });

      render(<PredictActivity item={item} />);

      expect(screen.getByLabelText('activity icon')).toBeOnTheScreen();
    });

    it('navigates to activity detail when pressed', () => {
      const item = createActivityItem();

      render(<PredictActivity item={item} />);
      const activityRow = screen.getByText('Buy');

      fireEvent.press(activityRow);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.ACTIVITY_DETAIL,
        params: { activity: item },
      });
    });
  });

  describe('SELL activity', () => {
    it('displays sell title with positive amount and negative percent', () => {
      const item = createActivityItem({
        type: PredictActivityType.SELL,
        percentChange: -3,
        entry: {
          type: 'sell',
          timestamp: 0,
          marketId: 'market-1',
          outcomeId: 'outcome-1',
          outcomeTokenId: 0,
          amount: 1234.5,
          price: 0.34,
        },
      });

      render(<PredictActivity item={item} />);

      expect(screen.getByText('Sell')).toBeOnTheScreen();
      expect(screen.getByText('+$1,234.50')).toBeOnTheScreen();
      expect(screen.getByText('-3%')).toBeOnTheScreen();
    });
  });

  describe('CLAIM activity', () => {
    it('displays claim title without detail text', () => {
      const item = createActivityItem({
        type: PredictActivityType.CLAIM,
        detail: '$123.45 on Yes • 34¢',
        entry: {
          type: 'claimWinnings',
          timestamp: 0,
          amount: 1234.5,
        },
      });

      render(<PredictActivity item={item} />);

      expect(screen.getByText('Claim')).toBeOnTheScreen();
      expect(screen.queryByText('$123.45 on Yes • 34¢')).toBeNull();
    });
  });
});
