import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import VbaVerifyIdentity from './VerifyIdentity';
import { VbaVerifyIdentitySelectorsIDs } from './VerifyIdentity.testIds';
import {
  METAMASK_PRIVACY_POLICY_URL,
  METAMASK_TERMS_URL,
} from '../../constants';
import { useKycSessionDisclaimers } from '../../hooks/useKycSessionDisclaimers';
import { trackKycEvent } from '../../utils/trackKycEvent';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  KYC_SCREEN_CONTENT_STATE,
  KYC_SCREEN_ID,
  KYC_SCREEN_PERFORMANCE_CONFIG,
} from '../../kycScreenPerformance';

jest.mock('../../utils/trackKycEvent', () => ({
  trackKycEvent: jest.fn(),
}));

jest.mock('../../hooks/useKycSessionDisclaimers');
const mockUseKycSessionDisclaimers = jest.mocked(useKycSessionDisclaimers);
jest.mock('../../../../../hooks/useScreenPerformance');
const mockUseScreenPerformance = jest.mocked(useScreenPerformance);
const mockRetry = jest.fn();
const mockOnContinue = jest.fn();

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
    id: 'kycProvider:sumsub-notice',
    key: 'sumsub-notice',
    version: '2',
    title: 'Sumsub Notice of Personal Data Processing',
    url: 'https://sumsub.example/notice',
  },
];

const renderScreen = () =>
  renderWithProvider(<VbaVerifyIdentity onContinue={mockOnContinue} />);

describe('VbaVerifyIdentity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKycSessionDisclaimers.mockReturnValue({
      disclaimers: catalogDisclaimers,
      isLoading: false,
      error: null,
      retry: mockRetry,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the introduction copy, verification steps, and partner benefits', () => {
    const { getByText, getByTestId } = renderScreen();

    expect(getByText('Verify your identity')).toBeOnTheScreen();
    expect(
      getByText(
        "This usually takes a few minutes. You'll need a government-issued ID.",
      ),
    ).toBeOnTheScreen();
    expect(getByText('Photograph your ID')).toBeOnTheScreen();
    expect(getByText('Take a selfie')).toBeOnTheScreen();
    expect(getByText('Confirm your details')).toBeOnTheScreen();
    expect(getByText('Answer a few questions')).toBeOnTheScreen();
    expect(
      getByText('We partner with idOS to verify your identity.'),
    ).toBeOnTheScreen();
    expect(getByText('Verify once, reuse later.')).toBeOnTheScreen();
    expect(
      getByText(
        'MetaMask securely stores an encrypted copy of your verified identity, so you can sign up with other partners faster.',
      ),
    ).toBeOnTheScreen();
    expect(getByText('You control your data.')).toBeOnTheScreen();
    expect(
      getByText(
        'We share your verified identity with a partner only when you agree.',
      ),
    ).toBeOnTheScreen();
    expect(getByText('Delete anytime.')).toBeOnTheScreen();
    expect(
      getByText('Delete your verified identity any time in Settings.'),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
    ).toBeEnabled();
    expect(mockUseScreenPerformance).toHaveBeenCalledWith({
      config: KYC_SCREEN_PERFORMANCE_CONFIG,
      screenId: KYC_SCREEN_ID.IDENTITY_VERIFICATION_TERMS,
      contentReady: true,
      contentState: KYC_SCREEN_CONTENT_STATE.POPULATED,
    });
  });

  it('shows the first page of two above the title', () => {
    const { getByTestId } = renderScreen();

    const indicator = getByTestId(VbaVerifyIdentitySelectorsIDs.STEP_INDICATOR);
    expect(indicator).toHaveTextContent('Step 1 of 2');
    expect(indicator.props.accessibilityLabel).toBe('Step 1 of 2');
  });

  it('renders the agreement sentence with both MetaMask links inline', () => {
    const { getByTestId } = renderScreen();

    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.AGREEMENT),
    ).toHaveTextContent(
      'By continuing, I agree to the MetaMask Terms of Use, acknowledge the MetaMask Privacy Notice and consent to MetaMask storing and transferring my information to idOS.',
    );
  });

  it('opens the MetaMask legal URLs from the agreement links', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId } = renderScreen();

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.METAMASK_TERMS_LINK),
    );
    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.METAMASK_PRIVACY_POLICY_LINK),
    );

    expect(openUrlSpy.mock.calls).toEqual([
      [METAMASK_TERMS_URL],
      [METAMASK_PRIVACY_POLICY_URL],
    ]);
  });

  it('opens identity verification help from the inline Learn more link', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(VbaVerifyIdentitySelectorsIDs.LEARN_MORE_LINK));

    expect(openUrlSpy).toHaveBeenCalledWith(
      'https://support.metamask.io/trade/identity-verification',
    );
  });

  it('returns to Money home when the header back button is pressed', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(VbaVerifyIdentitySelectorsIDs.BACK_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('hands the loaded catalog to the partners page on continue', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON));

    expect(mockOnContinue).toHaveBeenCalledWith(catalogDisclaimers);
  });

  it('disables continue while the terms are loading', () => {
    mockUseKycSessionDisclaimers.mockReturnValue({
      disclaimers: null,
      isLoading: true,
      error: null,
      retry: mockRetry,
    });

    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON));

    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
    ).toBeDisabled();
    expect(mockOnContinue).not.toHaveBeenCalled();
    expect(mockUseScreenPerformance).toHaveBeenCalledWith({
      config: KYC_SCREEN_PERFORMANCE_CONFIG,
      screenId: KYC_SCREEN_ID.IDENTITY_VERIFICATION_TERMS,
      contentReady: false,
      contentState: KYC_SCREEN_CONTENT_STATE.EMPTY,
    });
  });

  it('shows a retry and keeps continue disabled when the terms fail to load', () => {
    mockUseKycSessionDisclaimers.mockReturnValue({
      disclaimers: null,
      isLoading: false,
      error: 'Request timed out',
      retry: mockRetry,
    });

    const { getByTestId } = renderScreen();

    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.DISCLAIMERS_ERROR),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
    ).toBeDisabled();
    expect(mockUseScreenPerformance).toHaveBeenCalledWith({
      config: KYC_SCREEN_PERFORMANCE_CONFIG,
      screenId: KYC_SCREEN_ID.IDENTITY_VERIFICATION_TERMS,
      contentReady: true,
      contentState: KYC_SCREEN_CONTENT_STATE.ERROR,
    });

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.DISCLAIMERS_RETRY),
    );
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  describe('analytics', () => {
    const identityTermsProperties = () =>
      jest
        .mocked(trackKycEvent)
        .mock.calls.filter(
          ([event]) => event.category === 'KYC Identity Terms Updated',
        )
        .map(([, buildProperties]) => buildProperties());
    const identityTermsStatuses = () =>
      identityTermsProperties().map((properties) => properties.status);

    it('tracks page1_viewed once when the page opens', () => {
      renderScreen();

      expect(identityTermsStatuses()).toStrictEqual(['page1_viewed']);
      expect(identityTermsProperties()[0]).toMatchObject({
        screen_name: 'vba_onboarding',
        kyc_provider: 'sumsub',
      });
    });

    it('tracks failed when the terms fail to load', () => {
      mockUseKycSessionDisclaimers.mockReturnValue({
        disclaimers: null,
        isLoading: false,
        error: 'Request timed out',
        retry: mockRetry,
      });

      renderScreen();

      expect(identityTermsStatuses()).toStrictEqual(['page1_viewed', 'failed']);
    });

    it('tracks page1_accepted before advancing to the partners page', () => {
      const { getByTestId } = renderScreen();

      fireEvent.press(
        getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
      );

      expect(identityTermsStatuses()).toStrictEqual([
        'page1_viewed',
        'page1_accepted',
      ]);
      expect(
        jest.mocked(trackKycEvent).mock.invocationCallOrder.at(-1),
      ).toBeLessThan(mockOnContinue.mock.invocationCallOrder[0]);
    });
  });
});
