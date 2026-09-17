import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaVerifyIdentity from './VerifyIdentity';
import { VbaVerifyIdentitySelectorsIDs } from './VerifyIdentity.testIds';
import { METAMASK_PRIVACY_POLICY_URL, METAMASK_TERMS_URL } from './constants';
import { useKycSessionDisclaimers } from './hooks/useKycSessionDisclaimers';
import Engine from '../../../../../core/Engine';
import { hydrateAndNavigateVbaOnboarding } from './hydrateAndNavigateVbaOnboarding';

jest.mock('./hooks/useKycSessionDisclaimers');
jest.mock('./hydrateAndNavigateVbaOnboarding', () => ({
  hydrateAndNavigateVbaOnboarding: jest.fn(),
}));
jest.mock('../../../../../core/Engine', () => ({
  context: {
    KycController: {
      acceptProviderTerms: jest.fn(),
    },
  },
}));
const mockUseKycSessionDisclaimers = jest.mocked(useKycSessionDisclaimers);
const mockHydrateAndNavigate = jest.mocked(hydrateAndNavigateVbaOnboarding);
const mockRetry = jest.fn();

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

const catalogDisclaimers = [
  {
    id: 'idOS:idos-privacy',
    key: 'idos-privacy',
    version: '1',
    title: 'idOS Privacy Policy',
    url: 'https://idos.example/privacy',
  },
  {
    id: 'kycProvider:sumsub-terms',
    key: 'sumsub-terms',
    version: '2',
    title: 'Sumsub T&C',
    url: 'https://sumsub.example/terms',
  },
];

describe('VbaVerifyIdentity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKycSessionDisclaimers.mockReturnValue({
      disclaimers: catalogDisclaimers,
      isLoading: false,
      error: null,
      retry: mockRetry,
    });
    mockHydrateAndNavigate.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('renders the title, steps, and continue button', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <VbaVerifyIdentity />,
    );

    expect(getByText('Verify your identity')).toBeOnTheScreen();
    expect(getByText('Upload ID document')).toBeOnTheScreen();
    expect(getByText('Take a selfie')).toBeOnTheScreen();
    expect(getByText('Confirm personal details')).toBeOnTheScreen();
    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('navigates back when the header back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<VbaVerifyIdentity />);

    fireEvent.press(getByTestId(VbaVerifyIdentitySelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows the legal links regardless of the data and privacy toggle state', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <VbaVerifyIdentity />,
    );

    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.METAMASK_PRIVACY_POLICY_LINK),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.DATA_AND_PRIVACY_TOGGLE),
    );

    // Legal links are their own always-visible section, unaffected by the
    // "Data and privacy" toggle above them.
    expect(
      queryByTestId(VbaVerifyIdentitySelectorsIDs.METAMASK_PRIVACY_POLICY_LINK),
    ).toBeOnTheScreen();
  });

  it('keeps the data and privacy sub-topics collapsed by default', () => {
    const { queryByText } = renderWithProvider(<VbaVerifyIdentity />);

    expect(queryByText('What we collect')).not.toBeOnTheScreen();
    expect(queryByText('How we store data')).not.toBeOnTheScreen();
    expect(queryByText('How to delete')).not.toBeOnTheScreen();
  });

  it('shows sub-topic titles but keeps their body copy folded once data and privacy opens', () => {
    const { getByText, queryByText, getByTestId } = renderWithProvider(
      <VbaVerifyIdentity />,
    );

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.DATA_AND_PRIVACY_TOGGLE),
    );

    expect(getByText('What we collect')).toBeOnTheScreen();
    expect(getByText('How we store data')).toBeOnTheScreen();
    expect(getByText('How to delete')).toBeOnTheScreen();
    // Each sub-topic's body copy stays folded until individually expanded.
    expect(
      queryByText(
        'We collect personal information as part of identity verification, including legal full name, address, and more.',
      ),
    ).not.toBeOnTheScreen();
  });

  it('expands an individual sub-topic without affecting the others', () => {
    const { getByTestId, getByText, queryByText } = renderWithProvider(
      <VbaVerifyIdentity />,
    );

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.DATA_AND_PRIVACY_TOGGLE),
    );
    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.WHAT_WE_COLLECT_TOGGLE),
    );

    expect(
      getByText(
        'We collect personal information as part of identity verification, including legal full name, address, and more.',
      ),
    ).toBeOnTheScreen();
    expect(getByText('How we store data')).toBeOnTheScreen();
    expect(
      queryByText(
        'You can delete your data anytime by going to Settings > Manage data.',
      ),
    ).not.toBeOnTheScreen();
  });

  it('opens MetaMask legal links and catalog disclaimer URLs when pressed', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId, getByText } = renderWithProvider(
      <VbaVerifyIdentity />,
    );

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.METAMASK_PRIVACY_POLICY_LINK),
    );
    expect(openUrlSpy).toHaveBeenCalledWith(METAMASK_PRIVACY_POLICY_URL);

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.METAMASK_TERMS_LINK),
    );
    expect(openUrlSpy).toHaveBeenCalledWith(METAMASK_TERMS_URL);

    fireEvent.press(getByText('idOS Privacy Policy'));
    expect(openUrlSpy).toHaveBeenCalledWith('https://idos.example/privacy');

    fireEvent.press(getByText('Sumsub T&C'));
    expect(openUrlSpy).toHaveBeenCalledWith('https://sumsub.example/terms');
  });

  it('shows a skeleton loader instead of catalog links while the fetch is in flight, and disables the CTA', () => {
    mockUseKycSessionDisclaimers.mockReturnValue({
      disclaimers: null,
      isLoading: true,
      error: null,
      retry: mockRetry,
    });

    const { getByTestId } = renderWithProvider(<VbaVerifyIdentity />);

    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.DISCLAIMERS_LOADING),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
    ).toBeDisabled();
  });

  it('shows an error with a retry action and keeps the CTA disabled when the fetch fails', () => {
    mockUseKycSessionDisclaimers.mockReturnValue({
      disclaimers: null,
      isLoading: false,
      error: 'Request timed out',
      retry: mockRetry,
    });

    const { getByTestId, getByText } = renderWithProvider(
      <VbaVerifyIdentity />,
    );

    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.DISCLAIMERS_ERROR),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
    ).toBeDisabled();

    fireEvent.press(getByText('Try again'));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('records provider terms grouped by catalog then rehydrates when continue is pressed', async () => {
    const { getByTestId } = renderWithProvider(<VbaVerifyIdentity />);

    fireEvent.press(getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON));

    await waitFor(() => {
      expect(mockHydrateAndNavigate).toHaveBeenCalledTimes(1);
    });
    // idOS vs kycProvider links are split back into their groups and recorded
    // as { key, version } consent records — SumSub is not launched here.
    expect(
      Engine.context.KycController.acceptProviderTerms,
    ).toHaveBeenCalledWith({
      providerDisclaimersAccepted: [{ key: 'sumsub-terms', version: '2' }],
      idosDisclaimersAccepted: [{ key: 'idos-privacy', version: '1' }],
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not record provider terms while disclaimers are still loading', () => {
    mockUseKycSessionDisclaimers.mockReturnValue({
      disclaimers: null,
      isLoading: true,
      error: null,
      retry: mockRetry,
    });

    const { getByTestId } = renderWithProvider(<VbaVerifyIdentity />);

    fireEvent.press(getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON));

    expect(
      Engine.context.KycController.acceptProviderTerms,
    ).not.toHaveBeenCalled();
    expect(mockHydrateAndNavigate).not.toHaveBeenCalled();
  });
});
