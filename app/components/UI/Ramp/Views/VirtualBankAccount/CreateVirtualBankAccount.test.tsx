import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import CreateVirtualBankAccount from './CreateVirtualBankAccount';
import { CreateVirtualBankAccountSelectorsIDs } from './CreateVirtualBankAccount.testIds';
import { useKycDisclaimers } from './hooks/useKycDisclaimers';
import useMoneyVaultApy from '../../../Money/hooks/useMoneyVaultApy';
import { useVbaArrivalTime } from './hooks/useVbaArrivalTime';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  VBA_SCREEN_CONTENT_STATE,
  VBA_SCREEN_ID,
  VBA_SCREEN_PERFORMANCE_CONFIG,
} from './vbaScreenPerformance';
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

jest.mock('./hooks/useVbaArrivalTime');
const mockUseVbaArrivalTime = jest.mocked(useVbaArrivalTime);

jest.mock('../../../../../hooks/useScreenPerformance');
const mockUseScreenPerformance = jest.mocked(useScreenPerformance);

// Iron sends only the MoonPay Enterprise T&C, and its `display_name` does not
// say "MoonPay" — the screen rewords the label client-side.
const termsDisclaimer = {
  id: 'd-2',
  url: 'https://moonpay.example/terms',
  display_name: 'Terms and Conditions',
};

describe('CreateVirtualBankAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    mockUseKycDisclaimers.mockReturnValue({
      disclaimers: [termsDisclaimer],
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
    // Arrival-row behavior is covered by CreateVirtualBankAccount.view.test.tsx
    // (real hooks); the stub keeps KYC/CTA/APY tests off the payment-methods query.
    mockUseVbaArrivalTime.mockReturnValue({ arrivalTimeframe: undefined });
  });

  it('renders the intro design with feature rows and footer', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );

    expect(getByText('Add funds right from your bank')).toBeOnTheScreen();
    expect(getByText('No fees to add funds')).toBeOnTheScreen();
    expect(getByText('Arrives in a few business days')).toBeOnTheScreen();
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
    expect(mockUseScreenPerformance).toHaveBeenCalledWith({
      config: VBA_SCREEN_PERFORMANCE_CONFIG,
      screenId: VBA_SCREEN_ID.VENDOR_TERMS,
      contentReady: true,
      contentState: VBA_SCREEN_CONTENT_STATE.POPULATED,
    });
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

    // Component-view and integration tests cannot observe Fabric's Android
    // removal transition. Success leaves the CTA busy so a second tap cannot
    // start another advance while this screen is leaving.
    await waitFor(() => {
      expect(button).toBeDisabled();
    });
  });

  it('keeps the button label from being re-parented while the screen is removed', () => {
    const { getByTestId } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );

    // Loading toggles whether Fabric flattens the button content row. Pinning
    // that row stops the label moving during the Android removal transition.
    expect(
      getByTestId(
        CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON,
      ).findAllByProps({ collapsable: false }),
    ).not.toHaveLength(0);
  });

  it('reenables the CTA when vendor terms are not accepted', async () => {
    mockAcceptDisclaimers.mockResolvedValue(false);
    const { getByTestId } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );
    const button = getByTestId(
      CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON,
    );

    fireEvent.press(button);

    await waitFor(() => {
      expect(mockAcceptDisclaimers).toHaveBeenCalledTimes(1);
      expect(button).toBeEnabled();
    });
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('reenables the CTA when advancing throws', async () => {
    mockOnSuccess.mockRejectedValue(new Error('navigation failed'));
    const { getByTestId } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );
    const button = getByTestId(
      CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON,
    );

    fireEvent.press(button);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
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

    const { getByTestId, queryByText } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );

    expect(
      getByTestId(CreateVirtualBankAccountSelectorsIDs.DISCLAIMERS_LOADING),
    ).toBeOnTheScreen();
    // The hardcoded Privacy Policy waits for the Iron catalog too.
    expect(queryByText("MoonPay's Privacy Policy")).toBeNull();
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

    const { queryByTestId, queryByText, getByTestId } = renderWithProvider(
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
    expect(queryByText("MoonPay's Privacy Policy")).toBeNull();
    expect(
      getByTestId(
        CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON,
      ),
    ).toBeDisabled();
    expect(mockUseScreenPerformance).toHaveBeenCalledWith({
      config: VBA_SCREEN_PERFORMANCE_CONFIG,
      screenId: VBA_SCREEN_ID.VENDOR_TERMS,
      contentReady: true,
      contentState: VBA_SCREEN_CONTENT_STATE.EMPTY,
    });
  });

  it('renders the hardcoded MoonPay Privacy Policy link and opens the MoonPay privacy URL when pressed', () => {
    const spy = jest.spyOn(Linking, 'openURL');
    const { getByText, queryByText } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );

    expect(getByText("MoonPay's Privacy Policy")).toBeOnTheScreen();
    // The Iron T&C comes reworded, so the raw vendor name must not leak through.
    expect(queryByText('Terms and Conditions')).toBeNull();

    fireEvent.press(getByText("MoonPay's Privacy Policy"));

    expect(spy).toHaveBeenCalledWith(
      'https://www.moonpay.com/legal/privacy_policy',
    );
  });

  it('renders the Iron T&C link with the MoonPay label and opens the Iron URL when pressed', () => {
    const spy = jest.spyOn(Linking, 'openURL');
    const { getByText } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );

    expect(getByText("MoonPay's Terms and Conditions")).toBeOnTheScreen();

    fireEvent.press(getByText("MoonPay's Terms and Conditions"));

    expect(spy).toHaveBeenCalledWith('https://moonpay.example/terms');
  });

  it('labels multiple Iron links by their vendor display name instead of the single-T&C rewording', () => {
    mockUseKycDisclaimers.mockReturnValue({
      disclaimers: [
        termsDisclaimer,
        {
          id: 'd-3',
          url: 'https://moonpay.example/other',
          display_name: 'Other Document',
        },
      ],
      isLoading: false,
      isAccepting: false,
      error: null,
      acceptDisclaimers: mockAcceptDisclaimers,
      retry: mockRetry,
    });

    const { getByText } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );

    expect(getByText('Terms and Conditions')).toBeOnTheScreen();
    expect(getByText('Other Document')).toBeOnTheScreen();
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

    const { getByTestId, getByText, queryByText } = renderWithProvider(
      <CreateVirtualBankAccount onSuccess={mockOnSuccess} />,
    );

    expect(
      getByTestId(CreateVirtualBankAccountSelectorsIDs.DISCLAIMERS_ERROR),
    ).toBeOnTheScreen();
    expect(queryByText("MoonPay's Privacy Policy")).toBeNull();
    expect(
      getByTestId(
        CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON,
      ),
    ).toBeDisabled();
    expect(mockUseScreenPerformance).toHaveBeenCalledWith({
      config: VBA_SCREEN_PERFORMANCE_CONFIG,
      screenId: VBA_SCREEN_ID.VENDOR_TERMS,
      contentReady: true,
      contentState: VBA_SCREEN_CONTENT_STATE.ERROR,
    });

    fireEvent.press(getByText('Try again'));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });
});
