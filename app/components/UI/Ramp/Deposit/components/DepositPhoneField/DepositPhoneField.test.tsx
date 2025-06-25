import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DepositPhoneField from './DepositPhoneField';
import { DepositRegion, DEPOSIT_REGIONS } from '../../constants';

// Mock the dependencies
jest.mock('../../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      field: {},
      label: {},
      phoneInputWrapper: {},
      textFieldWrapper: {},
      countryPrefix: {},
      countryFlag: {},
      textFieldInput: {},
      error: {},
    },
    theme: {
      colors: {
        text: { muted: '#666' },
        border: { default: '#ccc' },
        background: { default: '#fff' },
        error: { default: '#ff0000' },
      },
      themeAppearance: 'light',
    },
  })),
}));

jest.mock('../../sdk', () => ({
  useDepositSDK: jest.fn(() => ({
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
    setSelectedRegion: jest.fn(),
  })),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('../../utils/PhoneFormatter/PhoneFormatter', () => {
  return jest.fn().mockImplementation(() => ({
    formatAsYouType: jest.fn(() => ({ text: '(555) 123-4567', template: '(___) ___-____' })),
    formatE164: jest.fn(() => '+15551234567'),
    convertForNewCountry: jest.fn(() => '5551234567'),
    getInitialPhoneDigits: jest.fn(() => '5551234567'),
  }));
});

jest.mock('libphonenumber-js/min/metadata', () => ({}), { virtual: true });

describe('DepositPhoneField', () => {
  const mockOnChangeText = jest.fn();

  const defaultRegion: DepositRegion = {
    code: 'US',
    flag: '🇺🇸',
    name: 'United States',
    phonePrefix: '+1',
    currency: 'USD',
    phoneDigitCount: 10,
    recommended: true,
    supported: true,
  };

  const defaultProps = {
    label: 'Phone Number',
    onChangeText: mockOnChangeText,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with label', () => {
    const { getByText } = render(
      <DepositPhoneField
        label="Phone Number"
        onChangeText={mockOnChangeText}
        value=""
      />
    );

    expect(getByText('Phone Number')).toBeTruthy();
  });

  it('displays country flag', () => {
    const { getByText } = render(
      <DepositPhoneField
        label="Phone Number"
        onChangeText={mockOnChangeText}
        value=""
      />
    );

    expect(getByText('🇺🇸')).toBeTruthy();
  });

  it('shows error message when provided', () => {
    const { getByText } = render(
      <DepositPhoneField
        label="Phone Number"
        onChangeText={mockOnChangeText}
        value=""
        error="Invalid phone number"
      />
    );

    expect(getByText('Invalid phone number')).toBeTruthy();
  });

  it('calls onChangeText when input changes', () => {
    const { getByTestId } = render(
      <DepositPhoneField
        label="Phone Number"
        onChangeText={mockOnChangeText}
        value=""
      />
    );

    const input = getByTestId('deposit-phone-field-test-id');
    fireEvent.changeText(input, '5551234567');

    expect(mockOnChangeText).toHaveBeenCalled();
  });

  it('displays placeholder text', () => {
    const { getByTestId } = render(
      <DepositPhoneField
        label="Phone Number"
        onChangeText={mockOnChangeText}
        value=""
      />
    );

    const input = getByTestId('deposit-phone-field-test-id');
    expect(input.props.placeholder).toBe('(555) 123-4567');
  });

  it('should open region modal when flag is pressed', () => {
    const { toJSON, getByRole } = render(
      <DepositPhoneField {...defaultProps} />,
    );

    const flagButton = getByRole('button');
    fireEvent.press(flagButton);

    expect(toJSON()).toMatchSnapshot();
  });

  it('should update selected region when a region is selected from modal', () => {
    const { getByRole, getByText } = render(
      <DepositPhoneField {...defaultProps} />,
    );

    const flagButton = getByRole('button');
    fireEvent.press(flagButton);
    const selectRegionButton = getByText(DEPOSIT_REGIONS[1].name);
    fireEvent.press(selectRegionButton);
    expect(mockSetSelectedRegion).toHaveBeenCalledWith(DEPOSIT_REGIONS[1]);
  });

  it('should use selectedRegion from context when available', () => {
    const contextRegion: DepositRegion = {
      code: 'DE',
      flag: '🇩🇪',
      name: 'Germany',
      phonePrefix: '+49',
      currency: 'EUR',
      phoneDigitCount: 10,
      supported: true,
    };

    mockUseDepositSDK.mockReturnValue({
      selectedRegion: contextRegion,
      setSelectedRegion: mockSetSelectedRegion,
    });

    const { toJSON } = render(<DepositPhoneField {...defaultProps} />);

    expect(toJSON()).toMatchSnapshot();
  });
});
