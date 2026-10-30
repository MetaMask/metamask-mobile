import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, within } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import VbaVerifyIdentity from './VerifyIdentity';
import { VbaVerifyIdentitySelectorsIDs } from './VerifyIdentity.testIds';
import {
  IDOS_PRIVACY_NOTICE_URL,
  METAMASK_PRIVACY_POLICY_URL,
  METAMASK_TERMS_URL,
} from '../../../Ramp/Views/VirtualBankAccount/constants';
import {
  KycConsentVendor,
  SOCURE_BIOMETRIC_PROCESSING_AGREEMENT_URL,
  SOCURE_PRIVACY_NOTICE_URL,
  SOCURE_TERMS_OF_USE_URL,
} from './kycConsentVendor';
import { useKycSessionDisclaimers } from '../../hooks/useKycSessionDisclaimers';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  KYC_SCREEN_CONTENT_STATE,
  KYC_SCREEN_ID,
  KYC_SCREEN_PERFORMANCE_CONFIG,
} from '../../kycScreenPerformance';

jest.mock('../../hooks/useKycSessionDisclaimers');
const mockUseKycSessionDisclaimers = jest.mocked(useKycSessionDisclaimers);
jest.mock('../../../../../hooks/useScreenPerformance');
const mockUseScreenPerformance = jest.mocked(useScreenPerformance);
const mockRetry = jest.fn();
const mockOnSuccess = jest.fn();

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

const MOCK_SHEET_OVERLAY = 'mock-terms-sheet-overlay';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { Pressable, View } = jest.requireActual('react-native');

  const MockBottomSheet = ReactActual.forwardRef(
    (
      {
        children,
        onClose,
        testID,
      }: {
        children: React.ReactNode;
        onClose?: () => void;
        testID?: string;
      },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: (callback?: () => void) => {
          onClose?.();
          callback?.();
        },
        onOpenBottomSheet: jest.fn(),
      }));
      return ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(Pressable, {
          testID: MOCK_SHEET_OVERLAY,
          onPress: onClose,
        }),
        children,
      );
    },
  );

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
  };
});

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
    title: 'Sumsub Terms and Conditions',
    url: 'https://sumsub.example/terms',
  },
];

const renderScreen = (vendor: KycConsentVendor = KycConsentVendor.Vba) =>
  renderWithProvider(
    <VbaVerifyIdentity onSuccess={mockOnSuccess} vendor={vendor} />,
  );

const openTermsSheet = (
  getByTestId: ReturnType<typeof renderScreen>['getByTestId'],
) =>
  fireEvent.press(getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON));

const toggleBiometricConsent = (
  getByTestId: ReturnType<typeof renderScreen>['getByTestId'],
) =>
  fireEvent.press(
    getByTestId(VbaVerifyIdentitySelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX),
  );

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

  it('renders the introduction copy, verification steps, and footer', () => {
    const { getByText, getByTestId } = renderScreen();

    expect(getByText('Verify your identity')).toBeOnTheScreen();
    expect(
      getByText(
        "This usually only takes a few minutes. You'll need a valid, government-issued photo ID on hand.",
      ),
    ).toBeOnTheScreen();
    expect(getByText('Photograph your ID')).toBeOnTheScreen();
    expect(getByText('Take a selfie')).toBeOnTheScreen();
    expect(getByText('Confirm your details')).toBeOnTheScreen();
    expect(getByText('Answer a few questions')).toBeOnTheScreen();
    expect(
      getByText(
        "By tapping Agree & Continue, you agree to MetaMask's Terms and Conditions and Privacy Policy. Your information is encrypted and shared securely with our verification providers. You'll review the details before continuing.",
      ),
    ).toBeOnTheScreen();
    expect(getByText('Agree & Continue')).toBeOnTheScreen();
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

  it('opens the MetaMask Terms and Privacy Policy from the footer links', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId } = renderScreen();

    const termsLink = getByTestId(
      VbaVerifyIdentitySelectorsIDs.METAMASK_TERMS_LINK,
    );
    const privacyLink = getByTestId(
      VbaVerifyIdentitySelectorsIDs.METAMASK_PRIVACY_POLICY_LINK,
    );
    expect(termsLink).toHaveTextContent('Terms and Conditions');
    expect(privacyLink).toHaveTextContent('Privacy Policy');

    fireEvent.press(termsLink);
    fireEvent.press(privacyLink);

    expect(openUrlSpy.mock.calls).toEqual([
      [METAMASK_TERMS_URL],
      [METAMASK_PRIVACY_POLICY_URL],
    ]);
    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
    ).toBeOnTheScreen();
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

  it('keeps the terms sheet closed until continue is pressed', () => {
    const { queryByTestId } = renderScreen();

    expect(
      queryByTestId(VbaVerifyIdentitySelectorsIDs.TERMS_SHEET),
    ).not.toBeOnTheScreen();
  });

  it('disables continue while the terms are loading', () => {
    mockUseKycSessionDisclaimers.mockReturnValue({
      disclaimers: null,
      isLoading: true,
      error: null,
      retry: mockRetry,
    });

    const { getByTestId, queryByTestId } = renderScreen();
    openTermsSheet(getByTestId);

    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
    ).toBeDisabled();
    expect(mockUseScreenPerformance).toHaveBeenCalledWith({
      config: KYC_SCREEN_PERFORMANCE_CONFIG,
      screenId: KYC_SCREEN_ID.IDENTITY_VERIFICATION_TERMS,
      contentReady: false,
      contentState: KYC_SCREEN_CONTENT_STATE.EMPTY,
    });
    expect(
      queryByTestId(VbaVerifyIdentitySelectorsIDs.TERMS_SHEET),
    ).not.toBeOnTheScreen();
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

  it('opens the data and privacy sheet with the provider documents only on continue, showing the catalog as is when none are recognised', () => {
    const { getByTestId, getByText } = renderScreen();

    openTermsSheet(getByTestId);

    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.TERMS_SHEET),
    ).toBeOnTheScreen();
    expect(mockUseScreenPerformance).toHaveBeenCalledWith({
      config: KYC_SCREEN_PERFORMANCE_CONFIG,
      screenId: KYC_SCREEN_ID.PROVIDER_TERMS_MODAL,
      contentReady: true,
    });
    expect(getByText('Data and privacy')).toBeOnTheScreen();
    expect(
      getByText(
        'Your information is shared securely with these providers to verify your identity.',
      ),
    ).toBeOnTheScreen();
    expect(getByText('idOS Privacy Policy')).toBeOnTheScreen();
    expect(getByText('Sumsub Terms and Conditions')).toBeOnTheScreen();
    expect(
      within(
        getByTestId(VbaVerifyIdentitySelectorsIDs.TERMS_SHEET),
      ).queryByText(/MetaMask/),
    ).not.toBeOnTheScreen();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('opens the catalog document URLs from the sheet', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId } = renderScreen();
    openTermsSheet(getByTestId);

    fireEvent.press(
      getByTestId(
        `${VbaVerifyIdentitySelectorsIDs.DISCLAIMER_LINK}-idOS:idos-privacy`,
      ),
    );
    fireEvent.press(
      getByTestId(
        `${VbaVerifyIdentitySelectorsIDs.DISCLAIMER_LINK}-kycProvider:sumsub-terms`,
      ),
    );

    expect(openUrlSpy.mock.calls).toEqual([
      ['https://idos.example/privacy'],
      ['https://sumsub.example/terms'],
    ]);
  });

  describe('with the idOS and Sumsub catalog legal reviewed', () => {
    const legalCatalog = [
      {
        id: 'idOS:privacy_notice',
        key: 'privacy_notice',
        version: '1',
        title: 'idOS Privacy Notice',
        url: 'https://idos.example/privacy-notice',
      },
      {
        id: 'idOS:privacy_policy',
        key: 'privacy_policy',
        version: '1',
        title: 'idOS Privacy Policy',
        url: 'https://idos.example/privacy-policy',
      },
      {
        id: 'idOS:transparency_document',
        key: 'transparency_document',
        version: '1',
        title: 'idOS Transparency Document',
        url: 'https://idos.example/transparency',
      },
      {
        id: 'idOS:end_user_agreement',
        key: 'end_user_agreement',
        version: '1',
        title: 'idOS End User Agreement v2',
        url: 'https://idos.example/eua',
      },
      {
        id: 'kycProvider:notice_of_personal_data_processing',
        key: 'notice_of_personal_data_processing',
        version: '1',
        title: 'Notice of Personal Data Processing',
        url: 'https://sumsub.example/personal-data',
      },
    ];

    const getSheetLinkTitles = (
      getAllByTestId: ReturnType<typeof renderScreen>['getAllByTestId'],
    ) =>
      getAllByTestId(
        new RegExp(`^${VbaVerifyIdentitySelectorsIDs.DISCLAIMER_LINK}-`),
      ).map((row) => within(row).getByText(/./).props.children);

    beforeEach(() => {
      mockUseKycSessionDisclaimers.mockReturnValue({
        disclaimers: legalCatalog,
        isLoading: false,
        error: null,
        retry: mockRetry,
      });
    });

    it('shows the four legal documents in order with their labels', () => {
      const { getByTestId, getAllByTestId, queryByTestId } = renderScreen();

      openTermsSheet(getByTestId);

      expect(getSheetLinkTitles(getAllByTestId)).toEqual([
        'idOS Terms and Conditions',
        'idOS Privacy Notice',
        'idOS Transparency Document',
        'Sumsub Privacy Notice',
      ]);
      expect(
        queryByTestId(VbaVerifyIdentitySelectorsIDs.SOCURE_TERMS_ROW),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(VbaVerifyIdentitySelectorsIDs.BPA_CONSENT_CHECKBOX),
      ).not.toBeOnTheScreen();
    });

    it('hides catalog documents legal did not ask for', () => {
      const { getByTestId, queryByTestId, queryByText } = renderScreen();

      openTermsSheet(getByTestId);

      expect(queryByText('idOS Privacy Policy')).not.toBeOnTheScreen();
      expect(
        queryByTestId(
          `${VbaVerifyIdentitySelectorsIDs.DISCLAIMER_LINK}-idOS:privacy_policy`,
        ),
      ).not.toBeOnTheScreen();
    });

    it('opens the backend URL from a relabelled row', () => {
      const openUrlSpy = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue(undefined);
      const { getByTestId } = renderScreen();
      openTermsSheet(getByTestId);

      fireEvent.press(
        getByTestId(
          `${VbaVerifyIdentitySelectorsIDs.DISCLAIMER_LINK}-kycProvider:notice_of_personal_data_processing`,
        ),
      );

      expect(openUrlSpy).toHaveBeenCalledWith(
        'https://sumsub.example/personal-data',
      );
    });
  });

  it('shows the biometric consent checkbox unticked and Agree disabled when the sheet opens', () => {
    const { getByTestId, getByText } = renderScreen();
    openTermsSheet(getByTestId);

    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX)
        .props.accessibilityState,
    ).toEqual(expect.objectContaining({ checked: false }));
    expect(
      getByText(/I explicitly consent to idOS Association processing/),
    ).toBeOnTheScreen();
    expect(getByText('Agree')).toBeOnTheScreen();
    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.AGREE_BUTTON),
    ).toBeDisabled();

    fireEvent.press(getByTestId(VbaVerifyIdentitySelectorsIDs.AGREE_BUTTON));

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('enables Agree only while the biometric consent checkbox is ticked', () => {
    const { getByTestId } = renderScreen();
    openTermsSheet(getByTestId);

    toggleBiometricConsent(getByTestId);
    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.AGREE_BUTTON),
    ).toBeEnabled();

    toggleBiometricConsent(getByTestId);
    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.AGREE_BUTTON),
    ).toBeDisabled();
  });

  it('opens the idOS Privacy Notice from the biometric consent', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId } = renderScreen();
    openTermsSheet(getByTestId);

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.BIOMETRIC_CONSENT_LINK),
    );

    expect(openUrlSpy).toHaveBeenCalledWith(IDOS_PRIVACY_NOTICE_URL);
  });

  it('closes the sheet and advances when the user consents and agrees', () => {
    const { getByTestId, queryByTestId } = renderScreen();
    openTermsSheet(getByTestId);
    toggleBiometricConsent(getByTestId);

    fireEvent.press(getByTestId(VbaVerifyIdentitySelectorsIDs.AGREE_BUTTON));

    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    expect(
      queryByTestId(VbaVerifyIdentitySelectorsIDs.TERMS_SHEET),
    ).not.toBeOnTheScreen();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  describe('with the Kalshi vendor', () => {
    const legalCatalog = [
      {
        id: 'idOS:end_user_agreement',
        key: 'end_user_agreement',
        version: '1',
        title: 'idOS End User Agreement v2',
        url: 'https://idos.example/eua',
      },
      {
        id: 'idOS:privacy_notice',
        key: 'privacy_notice',
        version: '1',
        title: 'idOS Privacy Notice',
        url: 'https://idos.example/privacy-notice',
      },
      {
        id: 'idOS:transparency_document',
        key: 'transparency_document',
        version: '1',
        title: 'idOS Transparency Document',
        url: 'https://idos.example/transparency',
      },
      {
        id: 'kycProvider:notice_of_personal_data_processing',
        key: 'notice_of_personal_data_processing',
        version: '1',
        title: 'Notice of Personal Data Processing',
        url: 'https://sumsub.example/personal-data',
      },
    ];

    const renderKalshi = () => renderScreen(KycConsentVendor.Kalshi);

    beforeEach(() => {
      mockUseKycSessionDisclaimers.mockReturnValue({
        disclaimers: legalCatalog,
        isLoading: false,
        error: null,
        retry: mockRetry,
      });
    });

    it('adds the Socure terms row after the four VBA documents', () => {
      const { getByTestId, getAllByTestId } = renderKalshi();

      openTermsSheet(getByTestId);

      const rows = getAllByTestId(
        /^vba-verify-identity-(disclaimer-link-.+|socure-terms-row)$/,
      );

      expect(rows.map((row) => row.props.testID)).toEqual([
        `${VbaVerifyIdentitySelectorsIDs.DISCLAIMER_LINK}-idOS:end_user_agreement`,
        `${VbaVerifyIdentitySelectorsIDs.DISCLAIMER_LINK}-idOS:privacy_notice`,
        `${VbaVerifyIdentitySelectorsIDs.DISCLAIMER_LINK}-idOS:transparency_document`,
        `${VbaVerifyIdentitySelectorsIDs.DISCLAIMER_LINK}-kycProvider:notice_of_personal_data_processing`,
        VbaVerifyIdentitySelectorsIDs.SOCURE_TERMS_ROW,
      ]);
      expect(
        getByTestId(VbaVerifyIdentitySelectorsIDs.SOCURE_TERMS_LINK),
      ).toHaveTextContent('Socure Terms of Use');
      expect(
        getByTestId(VbaVerifyIdentitySelectorsIDs.SOCURE_PRIVACY_LINK),
      ).toHaveTextContent('Privacy Notice');
    });

    it('opens the Socure terms and privacy URLs from the fifth row', () => {
      const openUrlSpy = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue(undefined);
      const { getByTestId } = renderKalshi();

      openTermsSheet(getByTestId);
      fireEvent.press(
        getByTestId(VbaVerifyIdentitySelectorsIDs.SOCURE_TERMS_LINK),
      );
      fireEvent.press(
        getByTestId(VbaVerifyIdentitySelectorsIDs.SOCURE_PRIVACY_LINK),
      );

      expect(openUrlSpy.mock.calls).toEqual([
        [SOCURE_TERMS_OF_USE_URL],
        [SOCURE_PRIVACY_NOTICE_URL],
      ]);
    });

    it('keeps Agree disabled until both consent checkboxes are ticked', () => {
      const { getByTestId } = renderKalshi();

      openTermsSheet(getByTestId);

      expect(
        getByTestId(VbaVerifyIdentitySelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX)
          .props.accessibilityState,
      ).toEqual(expect.objectContaining({ checked: false }));
      expect(
        getByTestId(VbaVerifyIdentitySelectorsIDs.BPA_CONSENT_CHECKBOX).props
          .accessibilityState,
      ).toEqual(expect.objectContaining({ checked: false }));
      expect(
        getByTestId(VbaVerifyIdentitySelectorsIDs.AGREE_BUTTON),
      ).toBeDisabled();

      toggleBiometricConsent(getByTestId);
      expect(
        getByTestId(VbaVerifyIdentitySelectorsIDs.AGREE_BUTTON),
      ).toBeDisabled();

      fireEvent.press(
        getByTestId(VbaVerifyIdentitySelectorsIDs.BPA_CONSENT_CHECKBOX),
      );
      expect(
        getByTestId(VbaVerifyIdentitySelectorsIDs.AGREE_BUTTON),
      ).toBeEnabled();

      fireEvent.press(
        getByTestId(VbaVerifyIdentitySelectorsIDs.BPA_CONSENT_CHECKBOX),
      );
      expect(
        getByTestId(VbaVerifyIdentitySelectorsIDs.AGREE_BUTTON),
      ).toBeDisabled();
    });

    it('opens the Biometric Processing Agreement placeholder from the BPA consent', () => {
      const openUrlSpy = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue(undefined);
      const { getByTestId } = renderKalshi();

      openTermsSheet(getByTestId);
      fireEvent.press(
        getByTestId(VbaVerifyIdentitySelectorsIDs.BPA_CONSENT_LINK),
      );

      expect(openUrlSpy).toHaveBeenCalledWith(
        SOCURE_BIOMETRIC_PROCESSING_AGREEMENT_URL,
      );
      expect(
        getByTestId(VbaVerifyIdentitySelectorsIDs.BPA_CONSENT_CHECKBOX).props
          .accessibilityState,
      ).toEqual(expect.objectContaining({ checked: false }));
    });
  });

  it('stays on the introduction when the sheet is dismissed without agreeing', () => {
    const { getByTestId, queryByTestId } = renderScreen();
    openTermsSheet(getByTestId);

    fireEvent.press(getByTestId(MOCK_SHEET_OVERLAY));

    expect(
      queryByTestId(VbaVerifyIdentitySelectorsIDs.TERMS_SHEET),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
    ).toBeOnTheScreen();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});
