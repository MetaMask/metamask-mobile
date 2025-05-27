import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import EnterEmail from './EnterEmail';
import Routes from '../../../../../constants/navigation/Routes';
import { DepositSdkResult } from '../../hooks/useDepositSdkMethod';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();

const mockUseDepositSdkMethodInitialValues: DepositSdkResult<'response'> = {
  error: null,
  loading: false,
  sdkMethod: jest.fn().mockResolvedValue('Success'),
  response: null,
};

let mockUseDepositSdkMethodValues: DepositSdkResult<'response'> = {
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
    title: 'Enter Email',
  }),
}));

function render(Component: React.ComponentType) {
  return renderDepositTestComponent(Component, Routes.DEPOSIT.ENTER_EMAIL);
}

describe('EnterEmail Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDepositSdkMethodValues = {
      ...mockUseDepositSdkMethodInitialValues,
    };
  });

  it('renders correctly', () => {
    render(EnterEmail);
    expect(
      screen.getByText(
        "We'll send a six-digit code to your email to check it's you.",
      ),
    ).toBeTruthy();
  });

  it('calls setOptions when the component mounts', () => {
    render(EnterEmail);
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Enter Email',
      }),
    );
  });

  it('displays loading state', async () => {
    mockUseDepositSdkMethodValues = {
      ...mockUseDepositSdkMethodInitialValues,
      loading: true,
    };
    render(EnterEmail);
    expect(screen.getByText('Sending email...')).toBeTruthy();
  });

  it('navigates to next screen on "Send email" button press with valid email', async () => {
    render(EnterEmail);
    const emailInput = screen.getByPlaceholderText('name@domain.com');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Send email' }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.DEPOSIT.OTP_CODE,
        undefined,
      );
    });
  });

  it('shows validation error for invalid email', async () => {
    render(EnterEmail);
    const emailInput = screen.getByPlaceholderText('name@domain.com');
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(screen.getByRole('button', { name: 'Send email' }));
    expect(screen.getByText('Please enter a valid email address')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('displays error message when API call fails', async () => {
    mockUseDepositSdkMethodValues.error = 'Invalid email address';
    render(EnterEmail);
    expect(screen.getByText('Invalid email address')).toBeTruthy();
  });
});
