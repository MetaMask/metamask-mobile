import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import EnterEmail from './EnterEmail';
import Routes from '../../../../../../constants/navigation/Routes';
import { DepositSdkMethodResult } from '../../hooks/useDepositSdkMethod';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';
import { BuyQuote } from '@consensys/native-ramps-sdk';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockTrackEvent = jest.fn();

const mockResponse = {
  data: null,
  error: null,
  isFetching: false,
};

const mockSendEmail = jest.fn().mockResolvedValue('Success');

const mockUseDepositSdkMethodInitialValues: DepositSdkMethodResult<'sendUserOtp'> =
  [mockResponse, mockSendEmail];

let mockUseDepositSdkMethodValues: DepositSdkMethodResult<'sendUserOtp'> = {
  ...mockUseDepositSdkMethodInitialValues,
};

const mockQuote = { quoteId: 'test-quote-id' } as BuyQuote;

jest.mock('../../hooks/useDepositSdkMethod', () => ({
  useDepositSdkMethod: () => mockUseDepositSdkMethodValues,
}));

jest.mock('../../../hooks/useAnalytics', () => () => mockTrackEvent);

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
    useRoute: () => ({
      params: {
        quote: mockQuote,
        paymentMethodId: 'test-payment-method-id',
        cryptoCurrencyChainId: '1',
      },
    }),
  };
});

function render(Component: React.ComponentType) {
  return renderDepositTestComponent(Component, Routes.DEPOSIT.ENTER_EMAIL);
}

describe('EnterEmail Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDepositSdkMethodValues = [
      { ...mockResponse },
      mockSendEmail.mockResolvedValue('Success'),
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
        quote: mockQuote,
        paymentMethodId: 'test-payment-method-id',
        cryptoCurrencyChainId: '1',
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
});
