import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DepositPhoneField from './DepositPhoneField';
import { formatUSPhoneNumber } from '../../utils';

jest.mock('../../utils', () => ({
  formatUSPhoneNumber: jest.fn(),
}));

const DEPOSIT_PHONE_FIELD_TEST_ID = 'deposit-phone-field-test-id';

describe('DepositPhoneField', () => {
  const mockOnChangeText = jest.fn();

  const defaultProps = {
    label: 'Phone Number',
    onChangeText: mockOnChangeText,
    testID: DEPOSIT_PHONE_FIELD_TEST_ID,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render should match snapshot', () => {
    const { toJSON } = render(<DepositPhoneField {...defaultProps} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('custom flags and country codes should match snapshot', () => {
    const customProps = {
      ...defaultProps,
      countryCode: '44',
      countryFlag: '🇬🇧',
    };
    const { toJSON } = render(<DepositPhoneField {...customProps} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('error message should match snapshot', () => {
    const errorMessage = 'Invalid phone number';
    const { toJSON } = render(
      <DepositPhoneField {...defaultProps} error={errorMessage} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('additional props should match snapshot', () => {
    const placeholder = 'Enter phone number';
    const { toJSON } = render(
      <DepositPhoneField
        {...defaultProps}
        placeholder={placeholder}
        maxLength={10}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should call onChangeText when text input changes', () => {
    const { getByTestId } = render(<DepositPhoneField {...defaultProps} />);
    const textField = getByTestId(DEPOSIT_PHONE_FIELD_TEST_ID);
    const phoneNumber = '5551234567';
    fireEvent.changeText(textField, phoneNumber);
    expect(mockOnChangeText).toHaveBeenCalledWith(phoneNumber);
  });

  it('should call formatUSPhoneNumber and pass raw value to onChangeText', () => {
    const { getByTestId } = render(<DepositPhoneField {...defaultProps} />);
    const textField = getByTestId(DEPOSIT_PHONE_FIELD_TEST_ID);
    const inputPhoneNumber = '1234567890';
    fireEvent.changeText(textField, inputPhoneNumber);
    expect(formatUSPhoneNumber).toHaveBeenCalledWith(inputPhoneNumber);
    expect(mockOnChangeText).toHaveBeenCalledWith(inputPhoneNumber);
  });
});
