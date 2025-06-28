import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DepositPhoneField from './DepositPhoneField';

const mockSetSelectedRegion = jest.fn();
const mockNavigation = {
  navigate: jest.fn(),
};

const mockUseDepositSDK = jest.fn(() => ({
  selectedRegion: {
    code: 'US',
    flag: '🇺🇸',
    name: 'United States',
    phonePrefix: '+1',
    currency: 'USD',
    template: '(XXX) XXX-XXXX',
    placeholder: '(555) 123-4567',
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
      code: 'DE',
      flag: '🇩🇪',
      name: 'Germany',
      phonePrefix: '+49',
      currency: 'EUR',
      template: 'XXX XXXXXXX',
      placeholder: '151 12345678',
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
      code: 'XX',
      flag: '🏳️',
      name: 'Unsupported Region',
      phonePrefix: '+999',
      currency: 'XXX',
      template: 'XXX XXX XXX',
      placeholder: '123 456 789',
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
