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

  it('calls onPress when pressed and not showing dismiss', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <PerpsMarketCategoryBadge {...defaultProps} onPress={onPress} />,
    );

    fireEvent.press(getByText('Crypto'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not show dismiss icon when showDismiss is false', () => {
    const { queryByTestId } = render(
      <PerpsMarketCategoryBadge
        {...defaultProps}
        testID="badge"
        showDismiss={false}
      />,
    );

    expect(queryByTestId('badge-dismiss')).toBeNull();
  });

  it('shows dismiss icon when showDismiss is true', () => {
    const { getByTestId } = render(
      <PerpsMarketCategoryBadge
        {...defaultProps}
        testID="badge"
        showDismiss
        isSelected
      />,
    );

    expect(getByTestId('badge-dismiss')).toBeTruthy();
  });

  it('calls onDismiss when pressed with showDismiss true', () => {
    const onDismiss = jest.fn();
    const onPress = jest.fn();
    const { getByTestId } = render(
      <PerpsMarketCategoryBadge
        {...defaultProps}
        testID="badge"
        showDismiss
        isSelected
        onPress={onPress}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.press(getByTestId('badge'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
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
