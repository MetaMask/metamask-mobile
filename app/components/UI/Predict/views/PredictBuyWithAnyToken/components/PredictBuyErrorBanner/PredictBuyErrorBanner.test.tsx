import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import PredictBuyErrorBanner from './PredictBuyErrorBanner';

describe('PredictBuyErrorBanner', () => {
  it('renders the price_changed variant with title and description', () => {
    renderWithProvider(
      <PredictBuyErrorBanner
        variant="price_changed"
        title="Price changed"
        description="Couldn't buy at $0.62"
        testID="price-changed-banner"
      />,
    );

    expect(screen.getByTestId('price-changed-banner')).toBeOnTheScreen();
    expect(screen.getByTestId('price-changed-banner-icon')).toBeOnTheScreen();
    expect(screen.getByTestId('price-changed-banner-title')).toHaveTextContent(
      'Price changed',
    );
    expect(
      screen.getByTestId('price-changed-banner-description'),
    ).toHaveTextContent("Couldn't buy at $0.62");
  });

  it('renders the order_failed variant with title and description', () => {
    renderWithProvider(
      <PredictBuyErrorBanner
        variant="order_failed"
        title="Order failed"
        description="Try again"
        testID="order-failed-banner"
      />,
    );

    expect(screen.getByTestId('order-failed-banner')).toBeOnTheScreen();
    expect(screen.getByTestId('order-failed-banner-title')).toHaveTextContent(
      'Order failed',
    );
    expect(
      screen.getByTestId('order-failed-banner-description'),
    ).toHaveTextContent('Try again');
  });

  it('falls back to a default testID prefix when none is provided', () => {
    renderWithProvider(
      <PredictBuyErrorBanner
        variant="order_failed"
        title="Order failed"
        description="Try again"
      />,
    );

    expect(
      screen.getByTestId('predict-buy-error-banner-title'),
    ).toBeOnTheScreen();
  });
});
