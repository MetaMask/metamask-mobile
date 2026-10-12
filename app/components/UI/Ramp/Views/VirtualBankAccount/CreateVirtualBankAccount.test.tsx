import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import CreateVirtualBankAccount from './CreateVirtualBankAccount';
import { CreateVirtualBankAccountSelectorsIDs } from './CreateVirtualBankAccount.testIds';
import { useKycDisclaimers } from './hooks/useKycDisclaimers';
import useMoneyVaultApy from '../../../Money/hooks/useMoneyVaultApy';
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

jest.mock('../../../Money/hooks/useMoneyVaultApy', () => ({
  __esModule: true,
  default: jest.fn(),
}));
const mockUseMoneyVaultApy = jest.mocked(useMoneyVaultApy);

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
    mockUseMoneyVaultApy.mockReturnValue({
      apyPercent: 4.2,
    } as unknown as ReturnType<typeof useMoneyVaultApy>);
  });

  it('renders the intro design with feature rows and footer', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );

    expect(getByText('Add funds right from your bank')).toBeOnTheScreen();
    expect(getByText('No fees to add funds')).toBeOnTheScreen();
    expect(getByText('Set up once, use anytime')).toBeOnTheScreen();
    expect(getByText('Starts earning straight away')).toBeOnTheScreen();
    expect(getByText('Powered by')).toBeOnTheScreen();
    expect(
      getByTestId(
        CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON,
      ),
    ).toBeOnTheScreen();
    expect(getByText('Get account details')).toBeOnTheScreen();
    expect(getByText('Deposits earn 4.2% APY as mUSD.')).toBeOnTheScreen();
  });

  it('shows the earn copy without a number when APY is unavailable', () => {
    mockUseMoneyVaultApy.mockReturnValue({
      apyPercent: undefined,
    } as unknown as ReturnType<typeof useMoneyVaultApy>);

    const { getByText, queryByText } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );

    expect(getByText('Deposits earn APY as mUSD.')).toBeOnTheScreen();
    expect(queryByText('Deposits earn 4.2% APY as mUSD.')).toBeNull();
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

  it('renders the full agreement sentence with a closing period', () => {
    const { getByText } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );

    expect(
      getByText(
        "By continuing, you are acknowledging that you have read and agreed to MoonPay's Privacy Policy and MoonPay's Terms and Conditions.",
      ),
    ).toBeOnTheScreen();
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
