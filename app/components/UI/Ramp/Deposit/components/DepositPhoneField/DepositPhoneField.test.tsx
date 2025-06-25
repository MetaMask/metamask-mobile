import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DepositPhoneField from './DepositPhoneField';

const mockSetSelectedRegion = jest.fn();

const mockUseDepositSDK = jest.fn(() => ({
  selectedRegion: {
    code: 'US',
    flag: '🇺🇸',
    name: 'United States',
    phonePrefix: '+1',
    currency: 'USD',
    phoneDigitCount: 10,
    placeholder: '(555) 123-4567',
    supported: true,
  },
  setSelectedRegion: mockSetSelectedRegion,
}));

jest.mock('../../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
}));

jest.mock('../../hooks/usePhoneFormatter', () =>
  jest.fn().mockImplementation(() => ({
    formatAsYouType: jest.fn(() => '(555) 123-4567'),
    formatE164: jest.fn(() => '+15551234567'),
    convertForNewCountry: jest.fn(() => '5551234567'),
    getInitialPhoneDigits: jest.fn(() => '5551234567'),
  })),
);

jest.mock('libphonenumber-js/min/metadata', () => ({}), { virtual: true });

describe('DepositPhoneField', () => {
  const mockOnChangeText = jest.fn();

  const defaultProps = {
    label: 'Phone Number',
    onChangeText: mockOnChangeText,
    value: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    const { toJSON } = render(
      <DepositPhoneField
        label="Phone Number"
        onChangeText={mockOnChangeText}
        value=""
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with error message', () => {
    const { toJSON } = render(
      <DepositPhoneField
        label="Phone Number"
        onChangeText={mockOnChangeText}
        value=""
        error="Invalid phone number"
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with value', () => {
    const { toJSON } = render(
      <DepositPhoneField
        label="Phone Number"
        onChangeText={mockOnChangeText}
        value="+15551234567"
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with different region', () => {
    const contextRegion = {
      code: 'DE',
      flag: '🇩🇪',
      name: 'Germany',
      phonePrefix: '+49',
      currency: 'EUR',
      phoneDigitCount: 10,
      supported: true,
      placeholder: '+49 123 456789',
    };

    mockUseDepositSDK.mockReturnValue({
      selectedRegion: contextRegion,
      setSelectedRegion: mockSetSelectedRegion,
    });

    const { toJSON } = render(<DepositPhoneField {...defaultProps} />);

    expect(toJSON()).toMatchSnapshot();
  });

  it('calls onChangeText when input changes', () => {
    const { getByTestId } = render(
      <DepositPhoneField
        label="Phone Number"
        onChangeText={mockOnChangeText}
        value=""
      />,
    );

    const input = getByTestId('deposit-phone-field-test-id');
    fireEvent.changeText(input, '5551234567');

    expect(mockOnChangeText).toHaveBeenCalled();
  });

  it('opens region modal when flag is pressed', () => {
    const { getByRole, toJSON } = render(
      <DepositPhoneField {...defaultProps} />,
    );

    const flagButton = getByRole('button');
    fireEvent.press(flagButton);

    expect(toJSON()).toMatchSnapshot();
  });
});
