import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import EnterEmail from './EnterEmail';
import { DepositSdkMethodResult } from '../../hooks/useDepositSdkMethod';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../../util/test/initial-root-state';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockTrackEvent = jest.fn();

const mockResponse = {
  data: null,
  error: null,
  isFetching: false,
};

const mockSendEmail = jest.fn().mockResolvedValue({
  stateToken: 'mock-state-token',
  isTncAccepted: false,
  email: 'test@example.com',
  expiresIn: 300,
});

const mockUseDepositSdkMethodInitialValues: DepositSdkMethodResult<'sendUserOtp'> =
  [mockResponse, mockSendEmail];

let mockUseDepositSdkMethodValues: DepositSdkMethodResult<'sendUserOtp'> = {
  ...mockUseDepositSdkMethodInitialValues,
};

jest.mock('../../hooks/useDepositSdkMethod', () => ({
  useDepositSdkMethod: () => mockUseDepositSdkMethodValues,
}));

jest.mock('../../../hooks/useAnalytics', () => () => mockTrackEvent);

const mockUseRoute = jest.fn(() => ({
  params: {
    redirectToRootAfterAuth: false,
  },
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
    useRoute: () => mockUseRoute(),
  };
});

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    { name: Routes.DEPOSIT.ENTER_EMAIL },
    {
      state: initialRootState,
    },
  );
}

describe('EnterEmail Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDepositSdkMethodValues = [
      { ...mockResponse },
      mockSendEmail.mockResolvedValue({
        stateToken: 'mock-state-token',
        isTncAccepted: false,
        email: 'test@example.com',
        expiresIn: 300,
      }),
    ];
  });

  it('renders initial state with email input', () => {
    render(EnterEmail);
    expect(screen.getByPlaceholderText('name@domain.com')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Send email' }),
    ).toBeOnTheScreen();
  });

  it('renders deposit screen header with navbar title', () => {
    render(EnterEmail);
    expect(
      screen.getByText(strings('deposit.enter_email.navbar_title')),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('deposit-back-navbar-button')).toBeOnTheScreen();
  });

  it('calls navigation.goBack when header back button is pressed', () => {
    render(EnterEmail);
    fireEvent.press(screen.getByTestId('deposit-back-navbar-button'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('renders loading state with disabled button', async () => {
    mockUseDepositSdkMethodValues = [
      { ...mockResponse, isFetching: true },
      jest.fn(),
    ];
    render(EnterEmail);
    expect(
      screen.getByRole('button', { name: 'Send email' }),
    ).toBeOnTheScreen();
  });

  it('navigates to next screen on "Send email" button press with valid email', async () => {
    render(EnterEmail);
    const emailInput = screen.getByPlaceholderText('name@domain.com');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Send email' }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.OTP_CODE, {
        email: 'test@example.com',
        stateToken: 'mock-state-token',
        redirectToRootAfterAuth: false,
      });
    });
  });

  it('tracks analytics event when submit button is pressed with valid email', async () => {
    render(EnterEmail);
    const emailInput = screen.getByPlaceholderText('name@domain.com');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Send email' }));
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith('RAMPS_EMAIL_SUBMITTED', {
        ramp_type: 'DEPOSIT',
      });
    });
  });

  it('shows validation error for invalid email', async () => {
    render(EnterEmail);
    const emailInput = screen.getByPlaceholderText('name@domain.com');
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(screen.getByRole('button', { name: 'Send email' }));
    expect(
      screen.getByText('Please enter a valid email address'),
    ).toBeOnTheScreen();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows error message when API call fails', async () => {
    mockSendEmail.mockRejectedValue(new Error('API Error'));
    render(EnterEmail);
    const emailInput = screen.getByPlaceholderText('name@domain.com');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Send email' }));
    await waitFor(() => {
      expect(mockSendEmail).toHaveBeenCalledWith();
    });
    expect(screen.getByText('API Error')).toBeOnTheScreen();
  });

  it('shows error when response missing stateToken', async () => {
    mockSendEmail.mockResolvedValue({
      isTncAccepted: false,
      email: 'test@example.com',
      expiresIn: 300,
      // stateToken missing
    });
    render(EnterEmail);
    const emailInput = screen.getByPlaceholderText('name@domain.com');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Send email' }));
    await waitFor(() => {
      expect(
        screen.getByText('State token is required for OTP verification'),
      ).toBeOnTheScreen();
    });
  });

  describe('when redirectToRootAfterAuth is true', () => {
    beforeEach(() => {
      mockUseRoute.mockReturnValue({
        params: {
          redirectToRootAfterAuth: true,
        },
      });
    });

    it('passes redirectToRootAfterAuth=true to OTP screen when navigating', async () => {
      render(EnterEmail);
      const emailInput = screen.getByPlaceholderText('name@domain.com');
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.press(screen.getByRole('button', { name: 'Send email' }));
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.OTP_CODE, {
          email: 'test@example.com',
          stateToken: 'mock-state-token',
          redirectToRootAfterAuth: true,
        });
      });
    });
  });
});
