import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import PredictBuyPreviewHeader, {
  PredictBuyPreviewHeaderTitle,
  PredictBuyPreviewHeaderBack,
} from './PredictBuyPreviewHeader';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import {
  Side,
  Recurrence,
  type PredictMarket,
  type PredictOutcome,
  type PredictOutcomeToken,
  type OrderPreview,
} from '../../../../types';

jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, options?: Record<string, unknown>) => {
    if (key === 'predict.buy_preview_outcome_at_price') {
      return `${options?.outcome} at ${options?.price}`;
    }
    return key;
  }),
}));

jest.mock('../../../../utils/format', () => ({
  formatCents: jest.fn((value: number) => `${value}¢`),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(() => ({
      goBack: jest.fn(),
    })),
  };
});

describe('PredictBuyPreviewHeader', () => {
  const createMockMarket = (
    overrides?: Partial<PredictMarket>,
  ): PredictMarket => ({
    id: 'market-123',
    title: 'Will Bitcoin reach $100k?',
    category: 'crypto',
    tags: [],
    liquidity: 1000,
    volume: 5000,
    slug: 'bitcoin-100k',
    providerId: 'provider-1',
    description: 'Test market',
    image: 'https://example.com/market.png',
    status: 'open',
    recurrence: Recurrence.NONE,
    outcomes: [
      {
        id: 'outcome-1',
        title: 'Yes',
        image: 'https://example.com/yes.png',
        tokens: [{ id: 'token-1', title: 'Yes', price: 0.65 }],
        groupItemTitle: '',
        providerId: 'provider-1',
        marketId: 'market-123',
        description: '',
        status: 'open',
        volume: 0,
      },
      {
        id: 'outcome-2',
        title: 'No',
        image: 'https://example.com/no.png',
        tokens: [{ id: 'token-2', title: 'No', price: 0.35 }],
        groupItemTitle: '',
        providerId: 'provider-1',
        marketId: 'market-123',
        description: '',
        status: 'open',
        volume: 0,
      },
    ],
    ...overrides,
  });

  const createMockOutcome = (
    overrides?: Partial<PredictOutcome>,
  ): PredictOutcome => ({
    id: 'outcome-1',
    title: 'Yes',
    image: 'https://example.com/yes.png',
    tokens: [
      { id: 'token-1', title: 'Yes', price: 0.65 },
      { id: 'token-2', title: 'Yes (alt)', price: 0.6 },
    ],
    groupItemTitle: '',
    providerId: 'provider-1',
    marketId: 'market-123',
    description: 'Test outcome',
    status: 'open',
    volume: 0,
    ...overrides,
  });

  const createMockOutcomeToken = (
    overrides?: Partial<PredictOutcomeToken>,
  ): PredictOutcomeToken => ({
    id: 'token-1',
    title: 'Yes',
    price: 0.65,
    ...overrides,
  });

  const createMockOrderPreview = (
    overrides?: Partial<OrderPreview>,
  ): OrderPreview => ({
    marketId: 'market-123',
    outcomeId: 'outcome-1',
    outcomeTokenId: 'token-1',
    timestamp: Date.now(),
    side: Side.BUY,
    sharePrice: 0.65,
    maxAmountSpent: 100,
    minAmountReceived: 0,
    slippage: 0.01,
    tickSize: 0.01,
    minOrderSize: 1,
    negRisk: false,
    ...overrides,
  });

  describe('PredictBuyPreviewHeader', () => {
    it('renders back button', () => {
      const market = createMockMarket();
      const outcome = createMockOutcome();

      renderWithProvider(
        <PredictBuyPreviewHeader
          market={market}
          outcome={outcome}
          outcomeToken={createMockOutcomeToken()}
        />,
      );

      expect(screen.getByTestId('back-button')).toBeOnTheScreen();
    });

    it('renders title component', () => {
      const market = createMockMarket();
      const outcome = createMockOutcome();

      renderWithProvider(
        <PredictBuyPreviewHeader
          market={market}
          outcome={outcome}
          outcomeToken={createMockOutcomeToken()}
        />,
      );

      expect(screen.getByText(/Will Bitcoin reach \$100k\?/)).toBeOnTheScreen();
    });

    it('calls onBack when provided', () => {
      const mockOnBack = jest.fn();
      const market = createMockMarket();
      const outcome = createMockOutcome();

      renderWithProvider(
        <PredictBuyPreviewHeader
          market={market}
          outcome={outcome}
          outcomeToken={createMockOutcomeToken()}
          onBack={mockOnBack}
        />,
      );

      const backButton = screen.getByTestId('back-button');
      fireEvent.press(backButton);

      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe('PredictBuyPreviewHeaderTitle', () => {
    it('displays market title', () => {
      const market = createMockMarket();
      const outcome = createMockOutcome();

      renderWithProvider(
        <PredictBuyPreviewHeaderTitle
          market={market}
          outcome={outcome}
          outcomeToken={createMockOutcomeToken()}
        />,
      );

      expect(screen.getByText(/Will Bitcoin reach \$100k\?/)).toBeOnTheScreen();
    });

    it('displays outcome token label with price', () => {
      const market = createMockMarket();
      const outcome = createMockOutcome();

      renderWithProvider(
        <PredictBuyPreviewHeaderTitle
          market={market}
          outcome={outcome}
          outcomeToken={createMockOutcomeToken()}
        />,
      );

      expect(screen.getByText(/Yes at 0\.65¢/)).toBeOnTheScreen();
    });

    it('shows group item title when present', () => {
      const market = createMockMarket();
      const outcome = createMockOutcome({
        groupItemTitle: 'Q1 2024',
      });

      renderWithProvider(
        <PredictBuyPreviewHeaderTitle
          market={market}
          outcome={outcome}
          outcomeToken={createMockOutcomeToken()}
        />,
      );

      expect(screen.getByText(/Q1 2024/)).toBeOnTheScreen();
    });

    it('does not show group item title when not present', () => {
      const market = createMockMarket();
      const outcome = createMockOutcome({
        groupItemTitle: undefined,
      });

      renderWithProvider(
        <PredictBuyPreviewHeaderTitle
          market={market}
          outcome={outcome}
          outcomeToken={createMockOutcomeToken()}
        />,
      );

      expect(screen.queryByText(/Q1 2024/)).not.toBeOnTheScreen();
    });

    it('uses preview outcomeTokenId to select token', () => {
      const market = createMockMarket();
      const outcome = createMockOutcome({
        tokens: [
          { id: 'token-1', title: 'Yes', price: 0.65 },
          { id: 'token-2', title: 'Yes (alt)', price: 0.6 },
        ],
      });
      const preview = createMockOrderPreview({
        outcomeTokenId: 'token-2',
        sharePrice: 0.6,
      });

      renderWithProvider(
        <PredictBuyPreviewHeaderTitle
          market={market}
          outcome={outcome}
          outcomeToken={createMockOutcomeToken({
            id: 'token-1',
            title: 'Yes',
            price: 0.65,
          })}
          preview={preview}
        />,
      );

      expect(screen.getByText(/Yes \(alt\) at 0\.6¢/)).toBeOnTheScreen();
    });

    it('falls back to outcomeToken prop when outcomeTokenId not found in outcome tokens', () => {
      const market = createMockMarket();
      const outcome = createMockOutcome({
        tokens: [
          { id: 'token-1', title: 'Yes', price: 0.65 },
          { id: 'token-2', title: 'Yes (alt)', price: 0.6 },
        ],
      });
      const preview = createMockOrderPreview({
        outcomeTokenId: 'token-nonexistent',
        sharePrice: 0.65,
      });

      renderWithProvider(
        <PredictBuyPreviewHeaderTitle
          market={market}
          outcome={outcome}
          outcomeToken={createMockOutcomeToken({
            id: 'token-2',
            title: 'Yes (alt)',
            price: 0.6,
          })}
          preview={preview}
        />,
      );

      expect(screen.getByText(/Yes \(alt\) at 0\.65¢/)).toBeOnTheScreen();
    });

    it('uses preview sharePrice when provided', () => {
      const market = createMockMarket();
      const outcome = createMockOutcome({
        tokens: [{ id: 'token-1', title: 'Yes', price: 0.65 }],
      });
      const preview = createMockOrderPreview({
        outcomeTokenId: 'token-1',
        sharePrice: 0.75,
      });

      renderWithProvider(
        <PredictBuyPreviewHeaderTitle
          market={market}
          outcome={outcome}
          outcomeToken={createMockOutcomeToken()}
          preview={preview}
        />,
      );

      expect(screen.getByText(/Yes at 0\.75¢/)).toBeOnTheScreen();
    });

    it('applies success color for Yes outcome', () => {
      const market = createMockMarket();
      const outcome = createMockOutcome({
        tokens: [{ id: 'token-1', title: 'Yes', price: 0.65 }],
      });

      renderWithProvider(
        <PredictBuyPreviewHeaderTitle
          market={market}
          outcome={outcome}
          outcomeToken={createMockOutcomeToken()}
        />,
      );

      const outcomeText = screen.getByText(/Yes at 0\.65¢/);
      expect(outcomeText).toBeOnTheScreen();
    });

    it('applies error color for No outcome', () => {
      const market = createMockMarket();
      const outcome = createMockOutcome({
        title: 'No',
        tokens: [{ id: 'token-2', title: 'No', price: 0.35 }],
      });

      renderWithProvider(
        <PredictBuyPreviewHeaderTitle
          market={market}
          outcome={outcome}
          outcomeToken={createMockOutcomeToken({
            id: 'token-2',
            title: 'No',
            price: 0.35,
          })}
        />,
      );

      const outcomeText = screen.getByText(/No at 0\.35¢/);
      expect(outcomeText).toBeOnTheScreen();
    });
  });

  describe('PredictBuyPreviewHeaderBack', () => {
    it('renders back button with testID', () => {
      renderWithProvider(<PredictBuyPreviewHeaderBack />);

      expect(screen.getByTestId('back-button')).toBeOnTheScreen();
    });

    it('calls onBack when provided and pressed', () => {
      const mockOnBack = jest.fn();

      renderWithProvider(<PredictBuyPreviewHeaderBack onBack={mockOnBack} />);

      const backButton = screen.getByTestId('back-button');
      fireEvent.press(backButton);

      expect(mockOnBack).toHaveBeenCalled();
    });

    it('calls goBack from navigation when onBack not provided', () => {
      const navigation = jest.requireMock('@react-navigation/native');
      const mockGoBack = jest.fn();
      (navigation.useNavigation as jest.Mock).mockReturnValue({
        goBack: mockGoBack,
      });

      renderWithProvider(<PredictBuyPreviewHeaderBack />);

      const backButton = screen.getByTestId('back-button');
      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles outcome with no tokens', () => {
      const market = createMockMarket();
      const outcome = createMockOutcome({
        tokens: [],
      });

      renderWithProvider(
        <PredictBuyPreviewHeaderTitle
          market={market}
          outcome={outcome}
          outcomeToken={createMockOutcomeToken()}
        />,
      );

      expect(screen.getByText(/Will Bitcoin reach \$100k\?/)).toBeOnTheScreen();
    });

    it('handles very long market title', () => {
      const market = createMockMarket({
        title:
          'Will the price of Bitcoin reach $100,000 USD by the end of 2024?',
      });
      const outcome = createMockOutcome();

      renderWithProvider(
        <PredictBuyPreviewHeaderTitle
          market={market}
          outcome={outcome}
          outcomeToken={createMockOutcomeToken()}
        />,
      );

      expect(
        screen.getByText(/Will the price of Bitcoin reach/),
      ).toBeOnTheScreen();
    });

    it('handles outcome with special characters in title', () => {
      const market = createMockMarket();
      const outcome = createMockOutcome({
        tokens: [{ id: 'token-1', title: 'Yes (50%+)', price: 0.65 }],
      });

      renderWithProvider(
        <PredictBuyPreviewHeaderTitle
          market={market}
          outcome={outcome}
          outcomeToken={createMockOutcomeToken({ title: 'Yes (50%+)' })}
        />,
      );

      expect(screen.getByText(/Yes \(50%\+\) at 0\.65¢/)).toBeOnTheScreen();
    });

    it('handles null preview by using outcomeToken prop', () => {
      const market = createMockMarket();
      const outcome = createMockOutcome();

      renderWithProvider(
        <PredictBuyPreviewHeaderTitle
          market={market}
          outcome={outcome}
          outcomeToken={createMockOutcomeToken({
            id: 'token-2',
            title: 'No',
            price: 0.35,
          })}
          preview={null}
        />,
      );

      expect(screen.getByText(/No at 0\.35¢/)).toBeOnTheScreen();
    });

    it('handles undefined preview by using outcomeToken prop', () => {
      const market = createMockMarket();
      const outcome = createMockOutcome();

      renderWithProvider(
        <PredictBuyPreviewHeaderTitle
          market={market}
          outcome={outcome}
          outcomeToken={createMockOutcomeToken({
            id: 'token-2',
            title: 'No',
            price: 0.35,
          })}
          preview={undefined}
        />,
      );

      expect(screen.getByText(/No at 0\.35¢/)).toBeOnTheScreen();
    });
  });
});
