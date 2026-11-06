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
import { useKycSessionDisclaimers } from '../../hooks/useKycSessionDisclaimers';
import { trackVbaEvent } from '../../../Ramp/Views/VirtualBankAccount/vbaAnalytics';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  KYC_SCREEN_CONTENT_STATE,
  KYC_SCREEN_ID,
  KYC_SCREEN_PERFORMANCE_CONFIG,
} from '../../kycScreenPerformance';

jest.mock('../../../Ramp/Views/VirtualBankAccount/vbaAnalytics', () => ({
  ...jest.requireActual('../../../Ramp/Views/VirtualBankAccount/vbaAnalytics'),
  trackVbaEvent: jest.fn(),
}));

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

const renderScreen = () =>
  renderWithProvider(<VbaVerifyIdentity onSuccess={mockOnSuccess} />);

const openTermsSheet = (
  getByTestId: ReturnType<typeof renderScreen>['getByTestId'],
) =>
  fireEvent.press(getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON));

type RenderedTree = ReturnType<ReturnType<typeof renderScreen>['toJSON']>;
type RenderedElement = Extract<NonNullable<RenderedTree>, { type: string }>;
type RenderedNode = RenderedElement | string;

interface RenderedContent {
  text: string[];
  links: string[];
  checkboxes: string[];
}

const getNodeText = (node: RenderedNode): string =>
  typeof node === 'string'
    ? node
    : (node.children ?? []).map(getNodeText).join('');

const collectContent = (
  node: RenderedNode,
  content: RenderedContent,
  isInsideText = false,
) => {
  if (typeof node === 'string') {
    return;
  }
  if (node.props.accessibilityRole === 'link') {
    content.links.push(`${getNodeText(node)} (${node.props.testID})`);
  }
  if (node.props.accessibilityRole === 'checkbox') {
    content.checkboxes.push(
      `${node.props.testID} checked=${node.props.accessibilityState?.checked}`,
    );
  }
  const isText = node.type === 'Text';
  if (isText && !isInsideText) {
    content.text.push(getNodeText(node));
  }
  (node.children ?? []).forEach((child) =>
    collectContent(child, content, isInsideText || isText),
  );
};

/** Visible text, links and checkboxes, in render order. */
const describeRenderedContent = (tree: RenderedTree) => {
  const content: RenderedContent = { text: [], links: [], checkboxes: [] };
  [tree ?? []].flat().forEach((node) => collectContent(node, content));
  return content;
};

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
        url: 'https://www.idos.network/legal/privacy-notice',
      },
      {
        id: 'idOS:privacy_policy',
        key: 'privacy_policy',
        version: '1',
        title: 'idOS Privacy Policy',
        url: 'https://www.idos.network/legal/privacy-policy',
      },
      {
        id: 'idOS:transparency_document',
        key: 'transparency_document',
        version: '1',
        title: 'idOS Transparency Document',
        url: 'https://www.idos.network/legal/transparency-document',
      },
      {
        id: 'idOS:end_user_agreement',
        key: 'end_user_agreement',
        version: '1',
        title: 'idOS End User Agreement v2',
        url: 'https://www.idos.network/legal/user-agreement',
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

    const idosRowTestId = (key: string) =>
      `${VbaVerifyIdentitySelectorsIDs.DISCLAIMER_LINK}-idOS:${key}`;

    it('shows only the three idOS documents, in order with their labels', () => {
      const { getByTestId, getAllByTestId } = renderScreen();

      openTermsSheet(getByTestId);

      expect(getSheetLinkTitles(getAllByTestId)).toEqual([
        'idOS Terms and Conditions',
        'idOS Privacy Policy',
        'idOS Transparency Document',
      ]);
    });

    it('opens each idOS document at its URL', () => {
      const openUrlSpy = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue(undefined);
      const { getByTestId } = renderScreen();
      openTermsSheet(getByTestId);

      fireEvent.press(getByTestId(idosRowTestId('end_user_agreement')));
      fireEvent.press(getByTestId(idosRowTestId('privacy_policy')));
      fireEvent.press(getByTestId(idosRowTestId('transparency_document')));

      expect(openUrlSpy.mock.calls).toEqual([
        ['https://www.idos.network/legal/user-agreement'],
        ['https://www.idos.network/legal/privacy-policy'],
        ['https://www.idos.network/legal/transparency-document'],
      ]);
    });

    it('prefixes the idOS Terms and Conditions row and links only the document name', () => {
      const { getByTestId, getByText } = renderScreen();
      openTermsSheet(getByTestId);

      expect(
        getByText('By tapping Agree, I agree to idOS Terms and Conditions'),
      ).toBeOnTheScreen();
      const termsLink = getByTestId(idosRowTestId('end_user_agreement'));
      expect(termsLink).toHaveTextContent('idOS Terms and Conditions', {
        exact: true,
      });
    });

    it('renders the sheet over the screen with its links and checkbox', () => {
      const { getByTestId, toJSON } = renderScreen();
      openTermsSheet(getByTestId);

      expect(describeRenderedContent(toJSON())).toMatchInlineSnapshot(`
{
  "checkboxes": [
    "vba-verify-identity-biometric-consent-checkbox checked=false",
  ],
  "links": [
    "Terms and Conditions (vba-verify-identity-metamask-terms-link)",
    "Privacy Policy (vba-verify-identity-metamask-privacy-policy-link)",
    "idOS Terms and Conditions (vba-verify-identity-disclaimer-link-idOS:end_user_agreement)",
    "idOS Privacy Policy (vba-verify-identity-disclaimer-link-idOS:privacy_policy)",
    "idOS Transparency Document (vba-verify-identity-disclaimer-link-idOS:transparency_document)",
    "Sumsub Notice of Personal Data Processing (vba-verify-identity-sumsub-personal-data-processing-link)",
    "Privacy Notice (vba-verify-identity-sumsub-privacy-notice-link)",
    "Sumsub Biometrics Processing Consent (vba-verify-identity-sumsub-biometrics-consent-link)",
    "idOS Privacy Notice (vba-verify-identity-biometric-consent-link)",
  ],
  "text": [
    "Verify your identity",
    "This usually only takes a few minutes. You'll need a valid, government-issued photo ID on hand.",
    "Photograph your ID",
    "Take a selfie",
    "Confirm your details",
    "Answer a few questions",
    "By tapping Agree & Continue, you agree to MetaMask's Terms and Conditions and Privacy Policy. Your information is encrypted and shared securely with our verification providers. You'll review the details before continuing.",
    "Agree & Continue",
    "Data and privacy",
    "Your information is shared securely with these providers to verify your identity.",
    "By tapping Agree, I agree to idOS Terms and Conditions",
    "idOS Privacy Policy",
    "idOS Transparency Document",
    "I acknowledge that my personal data will be processed as described in the Sumsub Notice of Personal Data Processing. Applicable to US residents only: I confirm that I have read the Privacy Notice and give my consent to the processing of my biometric information and biometric identifiers as described in the Sumsub Biometrics Processing Consent",
    "I explicitly consent to idOS Association processing my facial images and the biometric data derived from them to verify my identity, as described in idOS Privacy Notice.",
    "idOS Privacy Notice",
    "Agree",
  ],
}
`);
    });
  });

  describe('Sumsub acknowledgement', () => {
    it('shows the acknowledgement as text with no toggle or checkbox', () => {
      const { getByTestId, getAllByRole } = renderScreen();
      openTermsSheet(getByTestId);

      const acknowledgement = getByTestId(
        VbaVerifyIdentitySelectorsIDs.SUMSUB_ACKNOWLEDGEMENT,
      );
      expect(acknowledgement).toHaveTextContent(
        'I acknowledge that my personal data will be processed as described in the Sumsub Notice of Personal Data Processing. Applicable to US residents only: I confirm that I have read the Privacy Notice and give my consent to the processing of my biometric information and biometric identifiers as described in the Sumsub Biometrics Processing Consent',
        { exact: true },
      );
      expect(
        within(acknowledgement).queryByRole('checkbox'),
      ).not.toBeOnTheScreen();
      expect(
        within(acknowledgement).queryByRole('switch'),
      ).not.toBeOnTheScreen();
      expect(getAllByRole('checkbox')).toHaveLength(1);
    });

    it('opens each Sumsub document from its inline link', () => {
      const openUrlSpy = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue(undefined);
      const { getByTestId } = renderScreen();
      openTermsSheet(getByTestId);

      const links = [
        [
          VbaVerifyIdentitySelectorsIDs.SUMSUB_PERSONAL_DATA_PROCESSING_LINK,
          'Sumsub Notice of Personal Data Processing',
        ],
        [
          VbaVerifyIdentitySelectorsIDs.SUMSUB_PRIVACY_NOTICE_LINK,
          'Privacy Notice',
        ],
        [
          VbaVerifyIdentitySelectorsIDs.SUMSUB_BIOMETRICS_CONSENT_LINK,
          'Sumsub Biometrics Processing Consent',
        ],
      ];
      links.forEach(([testID, label]) => {
        const link = getByTestId(testID);
        expect(link).toHaveTextContent(label, { exact: true });
        fireEvent.press(link);
      });

      expect(openUrlSpy.mock.calls).toEqual([
        ['https://sumsub.com/notification-to-processing-of-personal-data/'],
        ['https://sumsub.com/privacy-notice-service/'],
        ['https://sumsub.com/privacy-user-acknowledgement-and-consent/'],
      ]);
    });

    it('does not tick the biometric consent or enable Agree', () => {
      jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
      const { getByTestId } = renderScreen();
      openTermsSheet(getByTestId);

      fireEvent.press(
        getByTestId(VbaVerifyIdentitySelectorsIDs.SUMSUB_PRIVACY_NOTICE_LINK),
      );

      expect(
        getByTestId(VbaVerifyIdentitySelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX)
          .props.accessibilityState,
      ).toEqual(expect.objectContaining({ checked: false }));
      expect(
        getByTestId(VbaVerifyIdentitySelectorsIDs.AGREE_BUTTON),
      ).toBeDisabled();
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

  it('opens the idOS Privacy Notice from a link outside the consent checkbox', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByRole, getByTestId } = renderScreen();
    openTermsSheet(getByTestId);

    const checkbox = getByTestId(
      VbaVerifyIdentitySelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX,
    );
    expect(checkbox.props.accessibilityLabel).toBe(
      'I explicitly consent to idOS Association processing my facial images and the biometric data derived from them to verify my identity, as described in idOS Privacy Notice.',
    );
    expect(within(checkbox).queryByRole('link')).not.toBeOnTheScreen();
    fireEvent.press(getByRole('link', { name: /idOS Privacy Notice/ }));

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

  describe('analytics', () => {
    const identityTermsProperties = () =>
      jest
        .mocked(trackVbaEvent)
        .mock.calls.filter(
          ([event]) => event.category === 'KYC Identity Terms Updated',
        )
        .map(([, buildProperties]) => buildProperties());
    const identityTermsStatuses = () =>
      identityTermsProperties().map((properties) => properties.status);

    it('tracks viewed once when the page opens', () => {
      renderScreen();

      expect(identityTermsStatuses()).toStrictEqual(['viewed']);
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

      expect(identityTermsStatuses()).toStrictEqual(['viewed', 'failed']);
    });

    it('tracks accepted when the user agrees, before advancing', async () => {
      const { getByTestId } = renderScreen();
      openTermsSheet(getByTestId);
      toggleBiometricConsent(getByTestId);

      fireEvent.press(getByTestId(VbaVerifyIdentitySelectorsIDs.AGREE_BUTTON));

      expect(identityTermsStatuses()).toStrictEqual(['viewed', 'accepted']);
      expect(
        jest.mocked(trackVbaEvent).mock.invocationCallOrder.at(-1),
      ).toBeLessThan(mockOnSuccess.mock.invocationCallOrder[0]);
    });

    it('does not track accepted when the sheet is dismissed', () => {
      const { getByTestId } = renderScreen();
      openTermsSheet(getByTestId);

      fireEvent.press(getByTestId(MOCK_SHEET_OVERLAY));

      expect(identityTermsStatuses()).toStrictEqual(['viewed']);
    });
  });
});
