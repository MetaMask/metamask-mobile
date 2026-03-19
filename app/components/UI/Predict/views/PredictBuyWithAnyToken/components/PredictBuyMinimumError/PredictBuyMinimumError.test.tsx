import React from 'react';
import { screen } from '@testing-library/react-native';
import PredictBuyMinimumError from './PredictBuyMinimumError';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';

jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, options?: Record<string, unknown>) => {
    if (key === 'predict.order.prediction_minimum_bet') {
      return `Minimum bet: ${options?.amount}`;
    }
    if (key === 'predict.order.prediction_insufficient_funds') {
      return `Not enough funds. You can use up to ${options?.amount}.`;
    }
    if (key === 'predict.order.no_funds_enough') {
      return 'Not enough funds.';
    }
    return key;
  }),
}));

jest.mock('../../../../utils/format', () => ({
  formatPrice: jest.fn((value: number) => `$${value.toFixed(2)}`),
}));

jest.mock('../../../../constants/transactions', () => ({
  MINIMUM_BET: 1,
}));

describe('PredictBuyMinimumError', () => {
  describe('when isBalanceLoading is true', () => {
    it('returns null and does not render anything', () => {
      renderWithProvider(
        <PredictBuyMinimumError
          isBalanceLoading
          isBelowMinimum={false}
          isInsufficientBalance={false}
          maxBetAmount={0}
        />,
      );

      expect(screen.queryByText(/Minimum bet:/)).not.toBeOnTheScreen();
    });

    it('returns null even when isBelowMinimum is true', () => {
      renderWithProvider(
        <PredictBuyMinimumError
          isBalanceLoading
          isBelowMinimum
          isInsufficientBalance={false}
          maxBetAmount={0}
        />,
      );

      expect(screen.queryByText(/Minimum bet:/)).not.toBeOnTheScreen();
    });

    it('returns null even when isInsufficientBalance is true', () => {
      renderWithProvider(
        <PredictBuyMinimumError
          isBalanceLoading
          isBelowMinimum={false}
          isInsufficientBalance
          maxBetAmount={5}
        />,
      );

      expect(screen.queryByText(/Not enough funds/)).not.toBeOnTheScreen();
    });
  });

  describe('when isBalanceLoading is false and isBelowMinimum is true', () => {
    it('displays error message with formatted minimum bet amount', () => {
      renderWithProvider(
        <PredictBuyMinimumError
          isBalanceLoading={false}
          isBelowMinimum
          isInsufficientBalance={false}
          maxBetAmount={0}
        />,
      );

      expect(screen.getByText(/Minimum bet:/)).toBeOnTheScreen();
      expect(screen.getByText(/\$1\.00/)).toBeOnTheScreen();
    });

    it('renders error text with correct styling', () => {
      renderWithProvider(
        <PredictBuyMinimumError
          isBalanceLoading={false}
          isBelowMinimum
          isInsufficientBalance={false}
          maxBetAmount={0}
        />,
      );

      const errorText = screen.getByText(/Minimum bet:/);
      expect(errorText).toBeOnTheScreen();
    });

    it('centers the error text', () => {
      renderWithProvider(
        <PredictBuyMinimumError
          isBalanceLoading={false}
          isBelowMinimum
          isInsufficientBalance={false}
          maxBetAmount={0}
        />,
      );

      const errorText = screen.getByText(/Minimum bet:/);
      expect(errorText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ textAlign: 'center' }),
        ]),
      );
    });
  });

  describe('when isInsufficientBalance is true', () => {
    it('displays max bet amount when maxBetAmount >= MINIMUM_BET', () => {
      renderWithProvider(
        <PredictBuyMinimumError
          isBalanceLoading={false}
          isBelowMinimum={false}
          isInsufficientBalance
          maxBetAmount={5}
        />,
      );

      expect(
        screen.getByText(/Not enough funds\. You can use up to \$5\.00\./),
      ).toBeOnTheScreen();
    });

    it('displays generic message when maxBetAmount < MINIMUM_BET', () => {
      renderWithProvider(
        <PredictBuyMinimumError
          isBalanceLoading={false}
          isBelowMinimum={false}
          isInsufficientBalance
          maxBetAmount={0.5}
        />,
      );

      expect(screen.getByText('Not enough funds.')).toBeOnTheScreen();
      expect(screen.queryByText(/You can use up to/)).not.toBeOnTheScreen();
    });

    it('prioritizes isBelowMinimum over isInsufficientBalance', () => {
      renderWithProvider(
        <PredictBuyMinimumError
          isBalanceLoading={false}
          isBelowMinimum
          isInsufficientBalance
          maxBetAmount={5}
        />,
      );

      expect(screen.getByText(/Minimum bet:/)).toBeOnTheScreen();
      expect(screen.queryByText(/Not enough funds/)).not.toBeOnTheScreen();
    });
  });

  describe('when all validation flags are false', () => {
    it('returns null and does not render anything', () => {
      renderWithProvider(
        <PredictBuyMinimumError
          isBalanceLoading={false}
          isBelowMinimum={false}
          isInsufficientBalance={false}
          maxBetAmount={0}
        />,
      );

      expect(screen.queryByText(/Minimum bet:/)).not.toBeOnTheScreen();
      expect(screen.queryByText(/Not enough funds/)).not.toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('prioritizes isBalanceLoading over all other flags', () => {
      renderWithProvider(
        <PredictBuyMinimumError
          isBalanceLoading
          isBelowMinimum
          isInsufficientBalance
          maxBetAmount={5}
        />,
      );

      expect(screen.queryByText(/Minimum bet:/)).not.toBeOnTheScreen();
      expect(screen.queryByText(/Not enough funds/)).not.toBeOnTheScreen();
    });
  });
});
