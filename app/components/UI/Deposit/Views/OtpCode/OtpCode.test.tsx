import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import OtpCode from './OtpCode';
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
  useDepositSdkMethod: () => mockUseDepositSdkValues,
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
  return renderScreen(
    Component,
    {
      name: Routes.DEPOSIT.OTP_CODE,
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

describe('OtpCode Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDepositSdkValues = {
      ...mockUseDepositSdkInitialValues,
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
    mockUseDepositSdkValues = {
      ...mockUseDepositSdkInitialValues,
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
    mockUseDepositSdkValues.error = 'Invalid code';
    render(OtpCode);
    expect(screen.getByText('Invalid code')).toBeTruthy();
  });
});
