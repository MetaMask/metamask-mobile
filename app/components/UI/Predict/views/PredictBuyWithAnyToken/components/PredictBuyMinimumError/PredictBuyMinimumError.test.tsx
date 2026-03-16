import React from 'react';
import { screen } from '@testing-library/react-native';
import PredictBuyMinimumError from './PredictBuyMinimumError';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';

jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, options?: Record<string, unknown>) => {
    if (key === 'predict.order.prediction_minimum_bet') {
      return `Minimum bet: ${options?.amount}`;
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
        <PredictBuyMinimumError isBalanceLoading isBelowMinimum={false} />,
      );

      expect(screen.queryByText(/Minimum bet:/)).not.toBeOnTheScreen();
    });

    it('returns null even when isBelowMinimum is true', () => {
      renderWithProvider(
        <PredictBuyMinimumError isBalanceLoading isBelowMinimum />,
      );

      expect(screen.queryByText(/Minimum bet:/)).not.toBeOnTheScreen();
    });
  });

  describe('when isBalanceLoading is false and isBelowMinimum is true', () => {
    it('displays error message with formatted minimum bet amount', () => {
      renderWithProvider(
        <PredictBuyMinimumError isBalanceLoading={false} isBelowMinimum />,
      );

      expect(screen.getByText(/Minimum bet:/)).toBeOnTheScreen();
      expect(screen.getByText(/\$1\.00/)).toBeOnTheScreen();
    });

    it('renders error text with correct styling', () => {
      renderWithProvider(
        <PredictBuyMinimumError isBalanceLoading={false} isBelowMinimum />,
      );

      const errorText = screen.getByText(/Minimum bet:/);
      expect(errorText).toBeOnTheScreen();
    });

    it('centers the error text', () => {
      renderWithProvider(
        <PredictBuyMinimumError isBalanceLoading={false} isBelowMinimum />,
      );

      const errorText = screen.getByText(/Minimum bet:/);
      expect(errorText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ textAlign: 'center' }),
        ]),
      );
    });
  });

  describe('when isBalanceLoading is false and isBelowMinimum is false', () => {
    it('returns null and does not render anything', () => {
      renderWithProvider(
        <PredictBuyMinimumError
          isBalanceLoading={false}
          isBelowMinimum={false}
        />,
      );

      expect(screen.queryByText(/Minimum bet:/)).not.toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('handles both flags being false', () => {
      renderWithProvider(
        <PredictBuyMinimumError
          isBalanceLoading={false}
          isBelowMinimum={false}
        />,
      );

      expect(screen.queryByText(/Minimum bet:/)).not.toBeOnTheScreen();
    });

    it('prioritizes isBalanceLoading over isBelowMinimum', () => {
      renderWithProvider(
        <PredictBuyMinimumError isBalanceLoading isBelowMinimum />,
      );

      expect(screen.queryByText(/Minimum bet:/)).not.toBeOnTheScreen();
    });
  });
});
