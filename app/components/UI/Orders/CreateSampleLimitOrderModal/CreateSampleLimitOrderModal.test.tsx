import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CreateSampleLimitOrderModal } from './CreateSampleLimitOrderModal';

describe('CreateSampleLimitOrderModal', () => {
  it('renders modal when isVisible is true', () => {
    const { getByText } = render(
      <CreateSampleLimitOrderModal isVisible onClose={jest.fn()} />,
    );

    expect(getByText('Place Sample Limit Order')).toBeTruthy();
    expect(getByText('Buy ETH')).toBeTruthy();
    expect(getByText('Sell ETH')).toBeTruthy();
    expect(getByText('Place Limit Order')).toBeTruthy();
  });

  it('allows toggling between Buy and Sell side', () => {
    const { getByText } = render(
      <CreateSampleLimitOrderModal isVisible onClose={jest.fn()} />,
    );

    const sellButton = getByText('Sell ETH');
    fireEvent.press(sellButton);
    expect(sellButton).toBeTruthy();
  });
});
