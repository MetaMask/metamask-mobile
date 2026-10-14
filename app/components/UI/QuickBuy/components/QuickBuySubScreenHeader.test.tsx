import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import QuickBuySubScreenHeader from './QuickBuySubScreenHeader';

describe('QuickBuySubScreenHeader', () => {
  const onBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the provided title', () => {
    render(<QuickBuySubScreenHeader title="Quote Details" onBack={onBack} />);
    expect(screen.getByText('Quote Details')).toBeOnTheScreen();
  });

  it('calls onBack when the back button is pressed', () => {
    render(<QuickBuySubScreenHeader title="Quote Details" onBack={onBack} />);
    fireEvent.press(screen.getByTestId('quick-buy-sub-screen-back-button'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
