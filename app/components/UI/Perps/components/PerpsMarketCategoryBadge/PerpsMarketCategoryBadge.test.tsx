import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsMarketCategoryBadge from './PerpsMarketCategoryBadge';

describe('PerpsMarketCategoryBadge', () => {
  const defaultProps = {
    label: 'Crypto',
    isSelected: false,
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with label', () => {
    const { getByText } = render(
      <PerpsMarketCategoryBadge {...defaultProps} />,
    );

    expect(getByText('Crypto')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <PerpsMarketCategoryBadge {...defaultProps} onPress={onPress} />,
    );

    fireEvent.press(getByText('Crypto'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibility properties', () => {
    const { getByRole } = render(
      <PerpsMarketCategoryBadge {...defaultProps} isSelected />,
    );

    const button = getByRole('button');
    expect(button.props.accessibilityState).toEqual({ selected: true });
  });

  it('renders with different labels', () => {
    const labels = ['Stocks', 'Commodities', 'Forex'];

    labels.forEach((label) => {
      const { getByText } = render(
        <PerpsMarketCategoryBadge {...defaultProps} label={label} />,
      );

      expect(getByText(label)).toBeTruthy();
    });
  });
});
