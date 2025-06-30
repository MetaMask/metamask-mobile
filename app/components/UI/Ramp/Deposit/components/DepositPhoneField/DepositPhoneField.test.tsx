import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DepositPhoneField from './DepositPhoneField';

const mockSetSelectedRegion = jest.fn();
const mockNavigation = {
  navigate: jest.fn(),
};

const mockUseDepositSDK = jest.fn(() => ({
  selectedRegion: {
    isoCode: 'US',
    flag: '🇺🇸',
    name: 'United States',
    phone: {
      prefix: '+1',
      placeholder: '(555) 555-1234',
      template: '(XXX) XXX-XXXX',
    },
    currency: 'USD',
    supported: true,
  },
  setSelectedRegion: mockSetSelectedRegion,
}));

jest.mock('../../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock('../../Views/Modals/RegionSelectorModal', () => ({
  createRegionSelectorModalNavigationDetails: jest.fn(() => ['RouteName', {}]),
}));

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
      isoCode: 'DE',
      flag: '🇩🇪',
      name: 'Germany',
      phone: {
        prefix: '+49',
        placeholder: '123 456 7890',
        template: 'XXX XXX XXXX',
      },
      currency: 'EUR',
      supported: true,
    };

    mockUseDepositSDK.mockReturnValue({
      selectedRegion: contextRegion,
      setSelectedRegion: mockSetSelectedRegion,
    });

    const { toJSON } = render(<DepositPhoneField {...defaultProps} />);

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly after input change', () => {
    const { getByTestId, toJSON } = render(
      <DepositPhoneField
        label="Phone Number"
        onChangeText={mockOnChangeText}
        value=""
      />,
    );

    const input = getByTestId('deposit-phone-field-test-id');
    fireEvent.changeText(input, '5551234567');

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly after flag button press', () => {
    const { getByRole, toJSON } = render(
      <DepositPhoneField {...defaultProps} />,
    );

    const flagButton = getByRole('button');
    fireEvent.press(flagButton);

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with onSubmitEditing callback', () => {
    const mockOnSubmitEditing = jest.fn();
    const { toJSON } = render(
      <DepositPhoneField
        label="Phone Number"
        onChangeText={mockOnChangeText}
        value=""
        onSubmitEditing={mockOnSubmitEditing}
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with unsupported region', () => {
    const unsupportedRegion = {
      isoCode: 'XX',
      flag: '🏳️',
      name: 'Unsupported Region',
      phone: {
        prefix: '+999',
        placeholder: '123 456 789',
        template: 'XXX XXX XXX',
      },
      currency: 'XXX',
      supported: false,
    };

    mockUseDepositSDK.mockReturnValue({
      selectedRegion: unsupportedRegion,
      setSelectedRegion: mockSetSelectedRegion,
    });

    const { toJSON } = render(<DepositPhoneField {...defaultProps} />);

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with long phone number', () => {
    const { toJSON } = render(
      <DepositPhoneField
        label="Phone Number"
        onChangeText={mockOnChangeText}
        value="+155512345678901234"
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with special characters in phone number', () => {
    const { toJSON } = render(
      <DepositPhoneField
        label="Phone Number"
        onChangeText={mockOnChangeText}
        value="+1(555)123-4567"
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
