import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import EnterEmail from './EnterEmail';
import { DepositSdkMethodResult } from '../../hooks/useDepositSdkMethod';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../../util/test/initial-root-state';
import Routes from '../../../../../../constants/navigation/Routes';

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

  it('render matches snapshot', () => {
    render(EnterEmail);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls setOptions when the component mounts', () => {
    render(EnterEmail);
    expect(mockSetNavigationOptions).toHaveBeenCalled();
  });

  it('renders loading state snapshot', async () => {
    mockUseDepositSdkMethodValues = [
      { ...mockResponse, isFetching: true },
      jest.fn(),
    ];
    render(EnterEmail);
    expect(screen.toJSON()).toMatchSnapshot();
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

  it('renders validation error snapshot invalid email', async () => {
    render(EnterEmail);
    const emailInput = screen.getByPlaceholderText('name@domain.com');
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(screen.getByRole('button', { name: 'Send email' }));
    expect(screen.toJSON()).toMatchSnapshot();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders error message snapshot when API call fails', async () => {
    mockSendEmail.mockRejectedValue(new Error('API Error'));
    render(EnterEmail);
    const emailInput = screen.getByPlaceholderText('name@domain.com');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Send email' }));
    await waitFor(() => {
      expect(mockSendEmail).toHaveBeenCalledWith();
    });
    expect(screen.toJSON()).toMatchSnapshot();
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
