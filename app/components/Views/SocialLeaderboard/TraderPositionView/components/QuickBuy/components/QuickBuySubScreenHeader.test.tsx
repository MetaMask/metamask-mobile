import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import QuickBuySubScreenHeader from './QuickBuySubScreenHeader';

describe('QuickBuySubScreenHeader', () => {
  const onBack = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the provided title', () => {
    render(
      <QuickBuySubScreenHeader
        title="Quote Details"
        onBack={onBack}
        onClose={onClose}
      />,
    );
    expect(screen.getByText('Quote Details')).toBeOnTheScreen();
  });

  it('calls onBack when the back button is pressed', () => {
    render(
      <QuickBuySubScreenHeader
        title="Quote Details"
        onBack={onBack}
        onClose={onClose}
      />,
    );
    fireEvent.press(screen.getByTestId('quick-buy-sub-screen-back-button'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is pressed', () => {
    render(
      <QuickBuySubScreenHeader
        title="Quote Details"
        onBack={onBack}
        onClose={onClose}
      />,
    );
    fireEvent.press(screen.getByTestId('quick-buy-sub-screen-close-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders both back and close buttons', () => {
    render(
      <QuickBuySubScreenHeader
        title="Select Quote"
        onBack={onBack}
        onClose={onClose}
      />,
    );
    expect(
      screen.getByTestId('quick-buy-sub-screen-back-button'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('quick-buy-sub-screen-close-button'),
    ).toBeOnTheScreen();
  });
});
