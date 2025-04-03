import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { isStablecoinLendingFeatureEnabled } from '../../Stake/constants';
import CurrencyToggle from './CurrencySwitch';

jest.mock('../../Stake/constants', () => ({
  isStablecoinLendingFeatureEnabled: jest.fn(),
}));

describe('CurrencyToggle', () => {
  const mockProps = {
    onPress: jest.fn(),
    value: '200.00',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when stablecoin lending is disabled', () => {
    (isStablecoinLendingFeatureEnabled as jest.Mock).mockReturnValue(false);

    const { getByTestId, getByText } = renderWithProvider(
      <CurrencyToggle {...mockProps} />,
    );

    expect(getByTestId('currency-toggle')).toBeTruthy();
    expect(getByText('200.00')).toBeTruthy();
  });

  it('renders correctly when stablecoin lending is enabled and usd is currency', () => {
    (isStablecoinLendingFeatureEnabled as jest.Mock).mockReturnValue(true);

    const { getByTestId, getByText } = renderWithProvider(
      <CurrencyToggle {...mockProps} />,
    );

    expect(getByTestId('currency-toggle')).toBeTruthy();
    expect(getByText('200.00')).toBeTruthy();
  });

  it('calls onPress when button is pressed', () => {
    (isStablecoinLendingFeatureEnabled as jest.Mock).mockReturnValue(false);

    const { getByTestId } = renderWithProvider(
      <CurrencyToggle {...mockProps} />,
    );

    fireEvent.press(getByTestId('currency-toggle'));
    expect(mockProps.onPress).toHaveBeenCalledTimes(1);
  });

  it('renders with correct styles', () => {
    (isStablecoinLendingFeatureEnabled as jest.Mock).mockReturnValue(false);

    const { getByTestId } = renderWithProvider(
      <CurrencyToggle {...mockProps} />,
    );

    const button = getByTestId('currency-toggle');
    expect(button.props.style).toMatchObject({
      backgroundColor: expect.any(String),
      borderColor: expect.any(String),
      borderWidth: 1,
    });
  });
});
