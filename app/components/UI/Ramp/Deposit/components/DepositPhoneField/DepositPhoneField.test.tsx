import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import DepositPhoneField from './DepositPhoneField';
import { DepositRegion } from '@consensys/native-ramps-sdk';
import {
  MOCK_US_REGION,
  MOCK_EUR_REGION,
  MOCK_CA_REGION,
  MOCK_UNSUPPORTED_REGION,
} from '../../testUtils/constants';

const mockSetSelectedRegion = jest.fn();
const mockNavigation = {
  navigate: jest.fn(),
};

const mockUseDepositSDK = jest.fn(() => ({
  selectedRegion: MOCK_US_REGION,
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
    regions: [] as DepositRegion[],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with US flag and calling code for US region', () => {
    const { getByText } = render(
      <DepositPhoneField
        label="Phone Number"
        onChangeText={mockOnChangeText}
        value=""
        regions={[]}
      />,
    );

    expect(getByText('🇺🇸')).toBeOnTheScreen();
    expect(getByText('+1')).toBeOnTheScreen();
  });

  it('renders with error message', () => {
    const { getByText } = render(
      <DepositPhoneField
        label="Phone Number"
        onChangeText={mockOnChangeText}
        value=""
        error="Invalid phone number"
        regions={[]}
      />,
    );

    expect(getByText('Invalid phone number')).toBeOnTheScreen();
  });

  it('renders with German flag and calling code for EUR region', () => {
    mockUseDepositSDK.mockReturnValue({
      selectedRegion: MOCK_EUR_REGION,
      setSelectedRegion: mockSetSelectedRegion,
    });

    const { getByText } = render(<DepositPhoneField {...defaultProps} />);

    expect(getByText('🇩🇪')).toBeOnTheScreen();
    expect(getByText('+49')).toBeOnTheScreen();
  });

  it('updates displayed region flag after region is selected from modal', () => {
    const testRegions = [MOCK_US_REGION, MOCK_EUR_REGION];
    let capturedOnRegionSelect: ((region: DepositRegion) => void) | undefined;

    mockNavigation.navigate.mockImplementation((_, params) => {
      if (params?.params?.onRegionSelect) {
        capturedOnRegionSelect = params.params.onRegionSelect;
      }
    });

    const { getByRole, getByText } = render(
      <DepositPhoneField {...defaultProps} regions={testRegions} />,
    );

    const flagButton = getByRole('button');
    fireEvent.press(flagButton);

    act(() => {
      if (capturedOnRegionSelect) {
        capturedOnRegionSelect(MOCK_EUR_REGION);
      }
    });

    expect(getByText('🇩🇪')).toBeOnTheScreen();
    expect(getByText('+49')).toBeOnTheScreen();
  });

  it('opens region selector modal when flag is pressed', () => {
    const testRegions = [MOCK_US_REGION, MOCK_EUR_REGION];

    (mockUseDepositSDK as jest.Mock).mockReturnValue({
      selectedRegion: MOCK_US_REGION,
      setSelectedRegion: mockSetSelectedRegion,
    });

    const { getByRole } = render(
      <DepositPhoneField {...defaultProps} regions={testRegions} />,
    );

    const flagButton = getByRole('button');
    fireEvent.press(flagButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('DepositModals', {
      screen: 'DepositRegionSelectorModal',
      params: {
        regions: testRegions,
        onRegionSelect: expect.any(Function),
        selectedRegion: MOCK_US_REGION,
        allRegionsSelectable: true,
        updateGlobalRegion: false,
        trackSelection: false,
      },
    });
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
          ...MOCK_US_REGION,
          phone: {
            ...MOCK_US_REGION.phone,
            template: '',
          },
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
      const testRegions = [MOCK_US_REGION];

      (mockUseDepositSDK as jest.Mock).mockReturnValue({
        selectedRegion: testRegions[0],
        setSelectedRegion: mockSetSelectedRegion,
      });

      const { getByRole } = render(
        <DepositPhoneField {...defaultProps} regions={testRegions} />,
      );
      const flagButton = getByRole('button');

      fireEvent.press(flagButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositRegionSelectorModal',
        params: {
          regions: testRegions,
          onRegionSelect: expect.any(Function),
          selectedRegion: testRegions[0],
          allRegionsSelectable: true,
          updateGlobalRegion: false,
          trackSelection: false,
        },
      });
    });

    it('passes regions prop to region selector modal when flag is pressed', () => {
      const testRegions = [MOCK_US_REGION, MOCK_CA_REGION];

      (mockUseDepositSDK as jest.Mock).mockReturnValue({
        selectedRegion: testRegions[0],
        setSelectedRegion: mockSetSelectedRegion,
      });

      const { getByRole } = render(
        <DepositPhoneField {...defaultProps} regions={testRegions} />,
      );

      const flagButton = getByRole('button');
      fireEvent.press(flagButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositRegionSelectorModal',
        params: {
          regions: testRegions,
          onRegionSelect: expect.any(Function),
          selectedRegion: testRegions[0],
          allRegionsSelectable: true,
          updateGlobalRegion: false,
          trackSelection: false,
        },
      });
    });

    it('clears input and updates region when new region is selected', () => {
      (mockUseDepositSDK as jest.Mock).mockReturnValue({
        selectedRegion: null,
        setSelectedRegion: mockSetSelectedRegion,
      });

      render(<DepositPhoneField {...defaultProps} value="+15551234567" />);

      mockSetSelectedRegion(MOCK_EUR_REGION);

      expect(mockSetSelectedRegion).toHaveBeenCalledWith(MOCK_EUR_REGION);
    });
  });

  describe('input formatting', () => {
    it('formats input correctly with US region template', () => {
      (mockUseDepositSDK as jest.Mock).mockReturnValue({
        selectedRegion: MOCK_US_REGION,
        setSelectedRegion: mockSetSelectedRegion,
      });
      const { getByTestId } = render(<DepositPhoneField {...defaultProps} />);
      const input = getByTestId('deposit-phone-field-test-id');

      fireEvent.changeText(input, '5551234567');

      expect(mockOnChangeText).toHaveBeenCalledWith('+15551234567');
    });

    it('formats input correctly with German region template', () => {
      (mockUseDepositSDK as jest.Mock).mockReturnValue({
        selectedRegion: MOCK_EUR_REGION,
        setSelectedRegion: mockSetSelectedRegion,
      });

      const { getByTestId } = render(<DepositPhoneField {...defaultProps} />);
      const input = getByTestId('deposit-phone-field-test-id');

      fireEvent.changeText(input, '1234567890');

      expect(mockOnChangeText).toHaveBeenCalledWith('+491234567890');
    });

    it('handles input with existing prefix in value', () => {
      (mockUseDepositSDK as jest.Mock).mockReturnValue({
        selectedRegion: MOCK_US_REGION,
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
        selectedRegion: MOCK_US_REGION,
        setSelectedRegion: mockSetSelectedRegion,
      });
      const { getByTestId } = render(<DepositPhoneField {...defaultProps} />);
      const input = getByTestId('deposit-phone-field-test-id');

      fireEvent.changeText(input, '(555) 123-4567 ext. 123');

      expect(mockOnChangeText).toHaveBeenCalledWith('+15551234567123');
    });
  });
});
