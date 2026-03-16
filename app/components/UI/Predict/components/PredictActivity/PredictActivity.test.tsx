import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PredictActivity from './PredictActivity';
import { PredictActivityType, type PredictActivityItem } from '../../types';
import Routes from '../../../../../constants/navigation/Routes';
import { TRANSACTION_DETAIL_EVENTS } from '../../../../../core/Analytics/events/transactions';
import { MonetizedPrimitive } from '../../../../../core/Analytics/MetaMetrics.types';

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn(() => ({ name: 'test-event' }));
const mockEventBuilder = {
  addProperties: jest.fn().mockReturnValue({ build: mockBuild }),
  build: mockBuild,
};
const mockCreateEventBuilder = jest.fn(() => mockEventBuilder);

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

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

  describe('Analytics Tracking', () => {
    it('tracks Transaction Detail List Item Clicked when pressed', () => {
      const item = createActivityItem();

      render(<PredictActivity item={item} />);
      fireEvent.press(screen.getByText('Buy'));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        TRANSACTION_DETAIL_EVENTS.LIST_ITEM_CLICKED,
      );
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction_type: 'predict_buy',
          monetized_primitive: MonetizedPrimitive.Predict,
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('tracks correct transaction_type for sell activity', () => {
      const item = createActivityItem({
        type: PredictActivityType.SELL,
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
      fireEvent.press(screen.getByText('Sell'));

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction_type: 'predict_sell',
        }),
      );
    });
  });
});
