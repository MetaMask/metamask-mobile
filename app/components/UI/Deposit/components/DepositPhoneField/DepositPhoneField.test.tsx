import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DepositPhoneField from './DepositPhoneField';

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

  it('should render default settings correctly', () => {
    const { toJSON } = render(<DepositPhoneField {...defaultProps} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render DepositPhoneField with correct label', () => {
    const { getByText } = render(<DepositPhoneField {...defaultProps} />);
    const label = getByText('Phone Number');
    expect(label).toBeTruthy();
  });

  it('should render TextField component with correct props', () => {
    const { getByTestId } = render(<DepositPhoneField {...defaultProps} />);
    const textField = getByTestId(DEPOSIT_PHONE_FIELD_TEST_ID);
    expect(textField).toBeTruthy();
  });

  it('should render default country code and flag', () => {
    const { getByText } = render(<DepositPhoneField {...defaultProps} />);
    const flag = getByText('🇺🇸');
    expect(flag).toBeTruthy();
    const countryCode = getByText('+1');
    expect(countryCode).toBeTruthy();
  });

  it('should render custom country code and flag when provided', () => {
    const customProps = {
      ...defaultProps,
      countryCode: '44',
      countryFlag: '🇬🇧',
    };
    const { getByText } = render(<DepositPhoneField {...customProps} />);
    const flag = getByText('🇬🇧');
    expect(flag).toBeTruthy();
    const countryCode = getByText('+44');
    expect(countryCode).toBeTruthy();
  });

  it('should render error text when error prop is provided', () => {
    const errorMessage = 'Invalid phone number';
    const { getByText } = render(
      <DepositPhoneField {...defaultProps} error={errorMessage} />,
    );
    const error = getByText(errorMessage);
    expect(error).toBeTruthy();
  });

  it('should not render error text when error prop is not provided', () => {
    const { queryByText } = render(<DepositPhoneField {...defaultProps} />);
    const error = queryByText(/invalid|error/i);
    expect(error).toBeNull();
  });

  it('should call onChangeText when text input changes', () => {
    const { getByTestId } = render(<DepositPhoneField {...defaultProps} />);
    const textField = getByTestId(DEPOSIT_PHONE_FIELD_TEST_ID);
    const phoneNumber = '5551234567';
    fireEvent.changeText(textField, phoneNumber);
    expect(mockOnChangeText).toHaveBeenCalledWith(phoneNumber);
  });

  it('should pass additional props to TextField', () => {
    const placeholder = 'Enter phone number';
    const { getByPlaceholderText } = render(
      <DepositPhoneField
        {...defaultProps}
        placeholder={placeholder}
        maxLength={10}
      />,
    );
    const textField = getByPlaceholderText(placeholder);
    expect(textField).toBeTruthy();
  });
});
