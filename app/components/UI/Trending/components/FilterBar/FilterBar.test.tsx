import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import FilterBar, { FilterButton } from './FilterBar';

describe('FilterButton', () => {
  const defaultProps = {
    testID: 'filter-btn',
    label: 'Test Label',
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders label text', () => {
    const { getByText } = renderWithProvider(
      <FilterButton {...defaultProps} />,
    );
    expect(getByText('Test Label')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <FilterButton {...defaultProps} onPress={onPress} />,
    );
    fireEvent.press(getByTestId('filter-btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <FilterButton {...defaultProps} onPress={onPress} disabled />,
    );
    const btn = getByTestId('filter-btn');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('is enabled by default', () => {
    const { getByTestId } = renderWithProvider(
      <FilterButton {...defaultProps} />,
    );
    expect(
      getByTestId('filter-btn').props.accessibilityState?.disabled,
    ).toBeFalsy();
  });

  it('passes numberOfLines and ellipsizeMode to Text', () => {
    const { getByText } = renderWithProvider(
      <FilterButton {...defaultProps} numberOfLines={1} ellipsizeMode="tail" />,
    );
    const text = getByText('Test Label');
    expect(text.props.numberOfLines).toBe(1);
    expect(text.props.ellipsizeMode).toBe('tail');
  });

  it('uses wide padding by default', () => {
    const { getByTestId } = renderWithProvider(
      <FilterButton {...defaultProps} />,
    );
    // wide=true is the default — component renders without error
    expect(getByTestId('filter-btn')).toBeTruthy();
  });

  it('renders with wide=false (compact padding)', () => {
    const { getByTestId } = renderWithProvider(
      <FilterButton {...defaultProps} wide={false} />,
    );
    expect(getByTestId('filter-btn')).toBeTruthy();
  });
});

describe('FilterBar', () => {
  const defaultProps = {
    priceChangeButtonText: '24h %',
    onPriceChangePress: jest.fn(),
    networkName: 'All Networks',
    onNetworkPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders price-change button with correct label', () => {
    const { getByText } = renderWithProvider(<FilterBar {...defaultProps} />);
    expect(getByText('24h %')).toBeTruthy();
  });

  it('renders network button with correct label', () => {
    const { getByText } = renderWithProvider(<FilterBar {...defaultProps} />);
    expect(getByText('All Networks')).toBeTruthy();
  });

  it('calls onPriceChangePress when price-change button is pressed', () => {
    const onPriceChangePress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <FilterBar {...defaultProps} onPriceChangePress={onPriceChangePress} />,
    );
    fireEvent.press(getByTestId('price-change-button'));
    expect(onPriceChangePress).toHaveBeenCalledTimes(1);
  });

  it('calls onNetworkPress when network button is pressed', () => {
    const onNetworkPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <FilterBar {...defaultProps} onNetworkPress={onNetworkPress} />,
    );
    fireEvent.press(getByTestId('all-networks-button'));
    expect(onNetworkPress).toHaveBeenCalledTimes(1);
  });

  it('disables price-change button when isPriceChangeDisabled is true', () => {
    const onPriceChangePress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <FilterBar
        {...defaultProps}
        onPriceChangePress={onPriceChangePress}
        isPriceChangeDisabled
      />,
    );
    const btn = getByTestId('price-change-button');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(btn);
    expect(onPriceChangePress).not.toHaveBeenCalled();
  });

  it('price-change button is enabled by default', () => {
    const { getByTestId } = renderWithProvider(<FilterBar {...defaultProps} />);
    expect(
      getByTestId('price-change-button').props.accessibilityState?.disabled,
    ).toBeFalsy();
  });

  it('renders extra filters when provided', () => {
    const { getByTestId } = renderWithProvider(
      <FilterBar
        {...defaultProps}
        extraFilters={
          <FilterButton
            testID="extra-filter"
            label="Extra"
            onPress={jest.fn()}
          />
        }
      />,
    );
    expect(getByTestId('extra-filter')).toBeTruthy();
  });

  it('renders without extra filters', () => {
    const { queryByTestId } = renderWithProvider(
      <FilterBar {...defaultProps} />,
    );
    expect(queryByTestId('extra-filter')).toBeNull();
  });
});
