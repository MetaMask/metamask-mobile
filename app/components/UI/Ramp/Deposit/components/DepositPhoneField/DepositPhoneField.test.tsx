import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DepositPhoneField from './DepositPhoneField';
import { DepositRegion, DEPOSIT_REGIONS } from '../../constants';

const mockSetSelectedRegion = jest.fn();
const mockUseDepositSDK = jest.fn();

jest.mock('../../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
}));

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
    mockUseDepositSDK.mockReturnValue({
      selectedRegion: defaultRegion,
      setSelectedRegion: mockSetSelectedRegion,
    });
  });

  it('render should match snapshot', () => {
    const { toJSON } = render(<DepositPhoneField {...defaultProps} />);
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
