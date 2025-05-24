import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import EnterEmail from './EnterEmail';
import Routes from '../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { DepositSdk } from '../../hooks/useDepositSdkMethod';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();

const mockUseDepositSdkInitialValues: DepositSdk = {
  error: null,
  loading: false,
  sdkMethod: jest.fn().mockResolvedValue('Success'),
  data: null,
};

let mockUseDepositSdkValues: DepositSdk = {
  ...mockUseDepositSdkInitialValues,
};

jest.mock('../../hooks/useDepositSdkMethod', () => ({
  useDepositSdk: () => mockUseDepositSdkValues,
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
  return renderScreen(
    Component,
    {
      name: Routes.DEPOSIT.ENTER_EMAIL,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('EnterEmail Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDepositSdkValues = {
      ...mockUseDepositSdkInitialValues,
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
    mockUseDepositSdkValues = {
      ...mockUseDepositSdkInitialValues,
      loading: true,
    };
    render(EnterEmail);
    expect(screen.getByText('Sending email...')).toBeTruthy();
  });

  it('navigates to next screen on "Send email" button press', async () => {
    render(EnterEmail);
    fireEvent.press(screen.getByRole('button', { name: 'Send email' }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.DEPOSIT.OTP_CODE,
        undefined,
      );
    });
  });

  it('displays error message when API call fails', async () => {
    mockUseDepositSdkValues.error = 'Invalid email address';
    render(EnterEmail);
    expect(screen.getByText('Invalid email address')).toBeTruthy();
  });
});
