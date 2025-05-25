import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import OtpCode from './OtpCode';
import Routes from '../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { DepositSdkResult } from '../../hooks/useDepositSdkMethod';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();

const mockUseDepositSdkMethodInitialValues: DepositSdkResult<'success'> = {
  error: null,
  loading: false,
  sdkMethod: jest.fn().mockResolvedValue('Success'),
  response: null,
};

let mockUseDepositSdkMethodValues: DepositSdkResult<'success'> = {
  ...mockUseDepositSdkMethodInitialValues,
};

jest.mock('../../hooks/useDepositSdkMethod', () => ({
  useDepositSdkMethod: () => mockUseDepositSdkMethodValues,
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetNavigationOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
    }),
  };
});

jest.mock('../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn().mockReturnValue({
    title: 'Enter six-digit code',
  }),
}));

function render(Component: React.ComponentType) {
  return renderDepositTestComponent(Component, Routes.DEPOSIT.OTP_CODE);
}

describe('OtpCode Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDepositSdkMethodValues = {
      ...mockUseDepositSdkMethodInitialValues,
    };
  });

  it('renders correctly', () => {
    render(OtpCode);
    expect(
      screen.getByText('Enter the 6 digit code that we sent to your email'),
    ).toBeTruthy();
  });

  it('calls setOptions when the component mounts', () => {
    render(OtpCode);
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Enter six-digit code',
      }),
    );
  });

  it('displays loading state', async () => {
    mockUseDepositSdkMethodValues = {
      ...mockUseDepositSdkMethodInitialValues,
      loading: true,
    };
    render(OtpCode);
    expect(screen.getByText('Verifying code...')).toBeTruthy();
  });

  it('navigates to next screen on submit button press', async () => {
    render(OtpCode);
    fireEvent.press(
      screen.getByRole('button', {
        name: 'Submit',
      }),
    );
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.DEPOSIT.ID_VERIFY,
        undefined,
      );
    });
  });

  it('displays error message when API call fails', async () => {
    mockUseDepositSdkMethodValues.error = 'Invalid code';
    render(OtpCode);
    expect(screen.getByText('Invalid code')).toBeTruthy();
  });

  it('disables submit button when loading or code is invalid', () => {
    mockUseDepositSdkMethodValues = {
      ...mockUseDepositSdkMethodInitialValues,
      loading: true,
    };
    render(OtpCode);
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();

    mockUseDepositSdkMethodValues = {
      ...mockUseDepositSdkMethodInitialValues,
      loading: false,
    };
    fireEvent.changeText(screen.getByPlaceholderText('Enter code'), '12345');
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();

    fireEvent.changeText(screen.getByPlaceholderText('Enter code'), '123456');
    expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled();
  });
});
