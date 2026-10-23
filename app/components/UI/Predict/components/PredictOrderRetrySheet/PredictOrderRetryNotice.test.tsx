import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PredictOrderRetryNoticeSelectorsIDs } from '../../Predict.testIds';
import { Side, type OrderPreview } from '../../types';
import PredictOrderRetryNotice from './PredictOrderRetryNotice';

const quote: OrderPreview = {
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: 'token-1',
  timestamp: 0,
  side: Side.SELL,
  sharePrice: 0.47,
  maxAmountSpent: 100,
  minAmountReceived: 47,
  minAmountReceivedAfterSlippage: 44,
  slippage: 0.05,
  tickSize: 0.01,
  minOrderSize: 1,
  negRisk: false,
};

describe('PredictOrderRetryNotice', () => {
  it('shows the moved price with the quote rows', () => {
    renderWithProvider(
      <PredictOrderRetryNotice
        variant="price_moved"
        preview={quote}
        previousPrice={0.5}
        expectedSize={100}
      />,
    );

    expect(screen.getByText('Price moved')).toBeOnTheScreen();
    expect(screen.getByText(/50¢ to 47¢/)).toBeOnTheScreen();
    expect(screen.getByText('Expected fill')).toBeOnTheScreen();
    expect(screen.getByText('Worst case (5% band)')).toBeOnTheScreen();
  });

  it('shows no quote rows for a state without a quote', () => {
    renderWithProvider(<PredictOrderRetryNotice variant="no_match" />);

    expect(screen.getByText('No match')).toBeOnTheScreen();
    expect(screen.queryByText('Fees')).toBeNull();
  });

  it('calls onDismiss from the close button', () => {
    const onDismiss = jest.fn();
    renderWithProvider(
      <PredictOrderRetryNotice variant="timeout" onDismiss={onDismiss} />,
    );

    fireEvent.press(
      screen.getByTestId(PredictOrderRetryNoticeSelectorsIDs.CLOSE_BUTTON),
    );

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('hides the close button without onDismiss', () => {
    renderWithProvider(<PredictOrderRetryNotice variant="failed" />);

    expect(
      screen.queryByTestId(PredictOrderRetryNoticeSelectorsIDs.CLOSE_BUTTON),
    ).toBeNull();
  });
});
