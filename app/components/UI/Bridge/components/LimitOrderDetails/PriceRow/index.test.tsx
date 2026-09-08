import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import PriceRow from './index';
import { PriceRowSelectorsIDs } from './testIds';

const defaultProps = {
  value: '2%',
  onPress: jest.fn(),
};

describe('PriceRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the slippage value', () => {
    const { getByTestId } = render(<PriceRow {...defaultProps} />);

    expect(getByTestId(PriceRowSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(PriceRowSelectorsIDs.VALUE)).toHaveTextContent('2%');
  });

  it('renders the slippage label', () => {
    const { getByText } = render(<PriceRow {...defaultProps} />);

    expect(getByText(strings('bridge.slippage'))).toBeOnTheScreen();
  });

  it('calls onPress when the value is pressed', () => {
    const { getByTestId } = render(<PriceRow {...defaultProps} />);

    fireEvent.press(getByTestId(PriceRowSelectorsIDs.CONTAINER));

    expect(defaultProps.onPress).toHaveBeenCalledTimes(1);
  });

  it('applies a custom testID when provided', () => {
    const { getByTestId, queryByTestId } = render(
      <PriceRow {...defaultProps} testID="custom-price-row" />,
    );

    expect(getByTestId('custom-price-row')).toBeOnTheScreen();
    expect(queryByTestId(PriceRowSelectorsIDs.CONTAINER)).toBeNull();
  });
});
