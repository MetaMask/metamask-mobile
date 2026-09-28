import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import CreateVirtualBankAccount from './CreateVirtualBankAccount';
import { CreateVirtualBankAccountSelectorsIDs } from './CreateVirtualBankAccount.testIds';
import { useKycDisclaimers } from './hooks/useKycDisclaimers';
const mockOnSuccess = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('./hooks/useKycDisclaimers');
const mockUseKycDisclaimers = jest.mocked(useKycDisclaimers);
const mockRetry = jest.fn();
const mockAcceptDisclaimers = jest.fn();

const privacyDisclaimer = {
  id: 'd-1',
  url: 'https://moonpay.example/privacy',
  display_name: "MoonPay's Privacy Policy",
};
const termsDisclaimer = {
  id: 'd-2',
  url: 'https://moonpay.example/terms',
  display_name: "MoonPay's Terms and Conditions",
};

describe('CreateVirtualBankAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    mockUseKycDisclaimers.mockReturnValue({
      disclaimers: [privacyDisclaimer, termsDisclaimer],
      isLoading: false,
      isAccepting: false,
      error: null,
      acceptDisclaimers: mockAcceptDisclaimers,
      retry: mockRetry,
    });
    mockAcceptDisclaimers.mockResolvedValue(true);
  });

  it('renders the activation design', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );

    expect(getByText('Activate your Virtual Bank Account')).toBeOnTheScreen();
    expect(getByText('Receive money locally')).toBeOnTheScreen();
    expect(getByText('Add money with ease')).toBeOnTheScreen();
    expect(getByText('Manage multiple currencies')).toBeOnTheScreen();
    expect(
      getByTestId(
        CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON,
      ),
    ).toBeOnTheScreen();
  });

  it('navigates back when the header back button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );

    fireEvent.press(
      getByTestId(CreateVirtualBankAccountSelectorsIDs.BACK_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('stores vendor terms locally before advancing to email', async () => {
    const { getByTestId } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );

    const button = getByTestId(
      CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON,
    );
    expect(button).toBeEnabled();

    fireEvent.press(button);

    await waitFor(() => {
      expect(mockAcceptDisclaimers).toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('keeps the CTA disabled while advancing', async () => {
    let resolveSuccess: (() => void) | undefined;
    mockOnSuccess.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSuccess = resolve;
        }),
    );
    const { getByTestId } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );
    const button = getByTestId(
      CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON,
    );

    fireEvent.press(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(button);
    expect(mockOnSuccess).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSuccess?.();
    });

    await waitFor(() => {
      expect(button).toBeEnabled();
    });
  });

  it('shows a skeleton loader instead of any disclaimer links while the fetch is in flight, and disables the CTA', () => {
    mockUseKycDisclaimers.mockReturnValue({
      disclaimers: null,
      isLoading: true,
      isAccepting: false,
      error: null,
      acceptDisclaimers: mockAcceptDisclaimers,
      retry: mockRetry,
    });

    const { getByTestId } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );

    expect(
      getByTestId(CreateVirtualBankAccountSelectorsIDs.DISCLAIMERS_LOADING),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON,
      ),
    ).toBeDisabled();
  });

  it('renders no disclaimer links and disables the CTA when the fetch comes back empty and is not loading', () => {
    mockUseKycDisclaimers.mockReturnValue({
      disclaimers: null,
      isLoading: false,
      isAccepting: false,
      error: null,
      acceptDisclaimers: mockAcceptDisclaimers,
      retry: mockRetry,
    });

    const { queryByTestId, getByTestId } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );

    expect(
      queryByTestId(CreateVirtualBankAccountSelectorsIDs.DISCLAIMERS_LOADING),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(
        `${CreateVirtualBankAccountSelectorsIDs.DISCLAIMER_LINK}-d-1`,
      ),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(
        CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON,
      ),
    ).toBeDisabled();
  });

  it('renders disclaimers from the KYC API and opens their URL when pressed', () => {
    const spy = jest.spyOn(Linking, 'openURL');
    const { getByText } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );

    expect(getByText("MoonPay's Privacy Policy")).toBeOnTheScreen();

    fireEvent.press(getByText("MoonPay's Privacy Policy"));

    expect(spy).toHaveBeenCalledWith('https://moonpay.example/privacy');
  });

  it('shows an error with a retry action and keeps the CTA disabled when the fetch fails', () => {
    mockUseKycDisclaimers.mockReturnValue({
      disclaimers: null,
      isLoading: false,
      isAccepting: false,
      error: 'Request timed out',
      acceptDisclaimers: mockAcceptDisclaimers,
      retry: mockRetry,
    });

    const { getByTestId, getByText } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );

    expect(
      getByTestId(CreateVirtualBankAccountSelectorsIDs.DISCLAIMERS_ERROR),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON,
      ),
    ).toBeDisabled();

    fireEvent.press(getByText('Try again'));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });
});
