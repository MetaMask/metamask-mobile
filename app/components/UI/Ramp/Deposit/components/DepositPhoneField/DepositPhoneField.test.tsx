import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DepositPhoneField from './DepositPhoneField';
import { DepositRegion } from '@consensys/native-ramps-sdk/dist/Deposit';

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
  } as DepositRegion,
  setSelectedRegion: mockSetSelectedRegion,
}));

jest.mock('../../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
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
    } as DepositRegion;

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
    } as DepositRegion;

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

  describe('undefined region handling', () => {
    it('handles input when selectedRegion is null', () => {
      (mockUseDepositSDK as jest.Mock).mockReturnValue({
        selectedRegion: null,
        setSelectedRegion: mockSetSelectedRegion,
      });

      const { getByTestId } = render(<DepositPhoneField {...defaultProps} />);
      const input = getByTestId('deposit-phone-field-test-id');

      fireEvent.changeText(input, '5551234567');

      expect(mockOnChangeText).toHaveBeenCalledWith('5551234567');
    });

    it('handles input when selectedRegion is undefined', () => {
      (mockUseDepositSDK as jest.Mock).mockReturnValue({
        selectedRegion: undefined,
        setSelectedRegion: mockSetSelectedRegion,
      });

      const { getByTestId } = render(<DepositPhoneField {...defaultProps} />);
      const input = getByTestId('deposit-phone-field-test-id');

      fireEvent.changeText(input, '5551234567');

      expect(mockOnChangeText).toHaveBeenCalledWith('5551234567');
    });

    it('displays fallback flag and text when region is null', () => {
      (mockUseDepositSDK as jest.Mock).mockReturnValue({
        selectedRegion: null,
        setSelectedRegion: mockSetSelectedRegion,
      });

      const { getByText } = render(<DepositPhoneField {...defaultProps} />);

      expect(getByText('🌍')).toBeOnTheScreen();
      expect(getByText('Select region')).toBeOnTheScreen();
    });

    it('displays fallback flag and text when region is undefined', () => {
      (mockUseDepositSDK as jest.Mock).mockReturnValue({
        selectedRegion: undefined,
        setSelectedRegion: mockSetSelectedRegion,
      });

      const { getByText } = render(<DepositPhoneField {...defaultProps} />);

      expect(getByText('🌍')).toBeOnTheScreen();
      expect(getByText('Select region')).toBeOnTheScreen();
    });

    it('uses default template when region phone template is missing', () => {
      (mockUseDepositSDK as jest.Mock).mockReturnValue({
        selectedRegion: {
          isoCode: 'US',
          flag: '🇺🇸',
          name: 'United States',
          phone: {
            prefix: '+1',
            placeholder: '(555) 555-1234',
            template: '',
          },
          currency: 'USD',
          supported: true,
        } as DepositRegion,
        setSelectedRegion: mockSetSelectedRegion,
      });

      const { getByTestId } = render(<DepositPhoneField {...defaultProps} />);
      const input = getByTestId('deposit-phone-field-test-id');

      fireEvent.changeText(input, '5551234567');

      expect(mockOnChangeText).toHaveBeenCalledWith('+15551234567');
    });

    it('handles input with non-numeric characters when region is null', () => {
      (mockUseDepositSDK as jest.Mock).mockReturnValue({
        selectedRegion: null,
        setSelectedRegion: mockSetSelectedRegion,
      });

      const { getByTestId } = render(<DepositPhoneField {...defaultProps} />);
      const input = getByTestId('deposit-phone-field-test-id');

      fireEvent.changeText(input, '(555) 123-4567');

      expect(mockOnChangeText).toHaveBeenCalledWith('5551234567');
    });

    it('handles empty input when region is null', () => {
      (mockUseDepositSDK as jest.Mock).mockReturnValue({
        selectedRegion: null,
        setSelectedRegion: mockSetSelectedRegion,
      });

      const { getByTestId } = render(<DepositPhoneField {...defaultProps} />);
      const input = getByTestId('deposit-phone-field-test-id');

      fireEvent.changeText(input, '');

      expect(mockOnChangeText).toHaveBeenCalledWith('');
    });
  });

  describe('region selection', () => {
    it('navigates to region selector when flag is pressed', () => {
      (mockUseDepositSDK as jest.Mock).mockReturnValue({
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
        } as DepositRegion,
        setSelectedRegion: mockSetSelectedRegion,
      });

      const { getByRole } = render(<DepositPhoneField {...defaultProps} />);
      const flagButton = getByRole('button');

      fireEvent.press(flagButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositRegionSelectorModal',
        params: {
          selectedRegionCode: 'US',
          handleSelectRegion: expect.any(Function),
        },
      });
    });

    it('clears input and updates region when new region is selected', () => {
      const newRegion = {
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
      } as DepositRegion;

      (mockUseDepositSDK as jest.Mock).mockReturnValue({
        selectedRegion: null,
        setSelectedRegion: mockSetSelectedRegion,
      });

      render(<DepositPhoneField {...defaultProps} value="+15551234567" />);

      mockSetSelectedRegion(newRegion);

      expect(mockSetSelectedRegion).toHaveBeenCalledWith(newRegion);
    });
  });

  describe('input formatting', () => {
    it('formats input correctly with US region template', () => {
      (mockUseDepositSDK as jest.Mock).mockReturnValue({
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
        } as DepositRegion,
        setSelectedRegion: mockSetSelectedRegion,
      });
      const { getByTestId } = render(<DepositPhoneField {...defaultProps} />);
      const input = getByTestId('deposit-phone-field-test-id');

      fireEvent.changeText(input, '5551234567');

      expect(mockOnChangeText).toHaveBeenCalledWith('+15551234567');
    });

    it('formats input correctly with German region template', () => {
      (mockUseDepositSDK as jest.Mock).mockReturnValue({
        selectedRegion: {
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
        } as DepositRegion,
        setSelectedRegion: mockSetSelectedRegion,
      });

      const { getByTestId } = render(<DepositPhoneField {...defaultProps} />);
      const input = getByTestId('deposit-phone-field-test-id');

      fireEvent.changeText(input, '1234567890');

      expect(mockOnChangeText).toHaveBeenCalledWith('+491234567890');
    });

    it('handles input with existing prefix in value', () => {
      (mockUseDepositSDK as jest.Mock).mockReturnValue({
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
        } as DepositRegion,
        setSelectedRegion: mockSetSelectedRegion,
      });
      const { getByTestId } = render(
        <DepositPhoneField {...defaultProps} value="+15551234567" />,
      );
      const input = getByTestId('deposit-phone-field-test-id');

      fireEvent.changeText(input, '5551234567');

      expect(mockOnChangeText).toHaveBeenCalledWith('+15551234567');
    });

    it('strips non-numeric characters from input', () => {
      (mockUseDepositSDK as jest.Mock).mockReturnValue({
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
        } as DepositRegion,
        setSelectedRegion: mockSetSelectedRegion,
      });
      const { getByTestId } = render(<DepositPhoneField {...defaultProps} />);
      const input = getByTestId('deposit-phone-field-test-id');

      fireEvent.changeText(input, '(555) 123-4567 ext. 123');

      expect(mockOnChangeText).toHaveBeenCalledWith('+15551234567123');
    });
  });
});
