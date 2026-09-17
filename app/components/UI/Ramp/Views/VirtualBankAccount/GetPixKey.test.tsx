import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import GetPixKey from './GetPixKey';
import { GetPixKeySelectorsIDs } from './GetPixKey.testIds';
import { useKycDisclaimers } from './hooks/useKycDisclaimers';
import { hydrateAndNavigateVbaOnboarding } from './hydrateAndNavigateVbaOnboarding';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockAcceptVendorTerms = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KycController: {
      acceptVendorTerms: (...args: unknown[]) => mockAcceptVendorTerms(...args),
    },
  },
}));

jest.mock('./hooks/useKycDisclaimers');
jest.mock('./hydrateAndNavigateVbaOnboarding', () => ({
  hydrateAndNavigateVbaOnboarding: jest.fn(),
}));
const mockUseKycDisclaimers = jest.mocked(useKycDisclaimers);
const mockHydrateAndNavigate = jest.mocked(hydrateAndNavigateVbaOnboarding);
const mockRetry = jest.fn();

const loadedDisclaimer = {
  id: 'd-1',
  url: 'https://iron.example/tc',
  display_name: 'Iron T&C',
};

describe('GetPixKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    mockUseKycDisclaimers.mockReturnValue({
      disclaimers: [loadedDisclaimer],
      isLoading: false,
      error: null,
      retry: mockRetry,
    });
    mockHydrateAndNavigate.mockResolvedValue(undefined);
  });

  it('renders the title, benefits, and agree and continue button', () => {
    const { getByText, getByTestId } = renderWithProvider(<GetPixKey />);

    expect(getByText('Get your Pix Key')).toBeOnTheScreen();
    expect(getByText('Deposit with')).toBeOnTheScreen();
    expect(getByText('pix')).toBeOnTheScreen();
    expect(
      getByText('Send local and international payments'),
    ).toBeOnTheScreen();
    expect(getByText('Powered by MoonPay.')).toBeOnTheScreen();
    expect(
      getByTestId(GetPixKeySelectorsIDs.AGREE_AND_CONTINUE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('navigates back when the header back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<GetPixKey />);

    fireEvent.press(getByTestId(GetPixKeySelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('rehydrates VBA onboarding when agree and continue is pressed after disclaimers load', async () => {
    const { getByTestId } = renderWithProvider(<GetPixKey />);

    const button = getByTestId(GetPixKeySelectorsIDs.AGREE_AND_CONTINUE_BUTTON);
    expect(button).toBeEnabled();

    fireEvent.press(button);
    await waitFor(() => {
      expect(mockHydrateAndNavigate).toHaveBeenCalledTimes(1);
    });
    expect(mockAcceptVendorTerms).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('records vendor-terms acceptance before rehydrating when agree and continue is pressed', async () => {
    const { getByTestId } = renderWithProvider(<GetPixKey />);

    fireEvent.press(
      getByTestId(GetPixKeySelectorsIDs.AGREE_AND_CONTINUE_BUTTON),
    );

    await waitFor(() => {
      expect(mockHydrateAndNavigate).toHaveBeenCalledTimes(1);
    });
    expect(mockAcceptVendorTerms).toHaveBeenCalledTimes(1);
    // Acceptance must be recorded before the re-hydrate reads the stage.
    expect(mockAcceptVendorTerms.mock.invocationCallOrder[0]).toBeLessThan(
      mockHydrateAndNavigate.mock.invocationCallOrder[0],
    );
  });

  it('shows a skeleton loader instead of any disclaimer links while the fetch is in flight, and disables the CTA', () => {
    mockUseKycDisclaimers.mockReturnValue({
      disclaimers: null,
      isLoading: true,
      error: null,
      retry: mockRetry,
    });

    const { getByTestId } = renderWithProvider(<GetPixKey />);

    expect(
      getByTestId(GetPixKeySelectorsIDs.DISCLAIMERS_LOADING),
    ).toBeOnTheScreen();
    expect(
      getByTestId(GetPixKeySelectorsIDs.AGREE_AND_CONTINUE_BUTTON),
    ).toBeDisabled();
  });

  it('renders no disclaimer links and disables the CTA when the fetch comes back empty and is not loading', () => {
    mockUseKycDisclaimers.mockReturnValue({
      disclaimers: null,
      isLoading: false,
      error: null,
      retry: mockRetry,
    });

    const { queryByTestId, getByTestId } = renderWithProvider(<GetPixKey />);

    expect(
      queryByTestId(GetPixKeySelectorsIDs.DISCLAIMERS_LOADING),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(`${GetPixKeySelectorsIDs.DISCLAIMER_LINK}-d-1`),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(GetPixKeySelectorsIDs.AGREE_AND_CONTINUE_BUTTON),
    ).toBeDisabled();
  });

  it('renders disclaimers from the KYC API and opens their URL when pressed', () => {
    const spy = jest.spyOn(Linking, 'openURL');
    const { getByText } = renderWithProvider(<GetPixKey />);

    expect(getByText('Iron T&C')).toBeOnTheScreen();

    fireEvent.press(getByText('Iron T&C'));

    expect(spy).toHaveBeenCalledWith('https://iron.example/tc');
  });

  it('shows an error with a retry action and keeps the CTA disabled when the fetch fails', () => {
    mockUseKycDisclaimers.mockReturnValue({
      disclaimers: null,
      isLoading: false,
      error: 'Request timed out',
      retry: mockRetry,
    });

    const { getByTestId, getByText } = renderWithProvider(<GetPixKey />);

    expect(
      getByTestId(GetPixKeySelectorsIDs.DISCLAIMERS_ERROR),
    ).toBeOnTheScreen();
    expect(
      getByTestId(GetPixKeySelectorsIDs.AGREE_AND_CONTINUE_BUTTON),
    ).toBeDisabled();

    fireEvent.press(getByText('Try again'));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });
});
