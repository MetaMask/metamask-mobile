import React from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaVerificationPartners from './VerificationPartners';
import { BiometricConsentProvider } from './BiometricConsentContext';
import { VbaVerificationPartnersSelectorsIDs } from './VerifyIdentity.testIds';
import { useKycSessionDisclaimers } from '../../hooks/useKycSessionDisclaimers';
import {
  IDOS_PRIVACY_NOTICE_URL,
  IDOS_TERMS_URL,
  SUMSUB_BIOMETRICS_CONSENT_URL,
  SUMSUB_PERSONAL_DATA_PROCESSING_URL,
  SUMSUB_PRIVACY_NOTICE_URL,
} from '../../../Ramp/Views/VirtualBankAccount/constants';
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

// The label crossfade is covered in CrossfadeButton.test.tsx; here the button
// switches instantly, as it does with Reduce Motion on.
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => true),
}));

jest.mock('../../hooks/useKycSessionDisclaimers');
const mockUseKycSessionDisclaimers = jest.mocked(useKycSessionDisclaimers);
jest.mock('../../../../../hooks/useScreenPerformance');
const mockUseScreenPerformance = jest.mocked(useScreenPerformance);
const mockRetry = jest.fn();
const mockOnAgree = jest.fn();
const mockOnBack = jest.fn();

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
    url: 'https://www.idos.network/legal/user-agreement-v2',
  },
  {
    id: 'kycProvider:notice_of_personal_data_processing',
    key: 'notice_of_personal_data_processing',
    version: '1',
    title: 'Notice of Personal Data Processing',
    url: 'https://sumsub.example/personal-data',
  },
];

const renderScreen = () =>
  renderWithProvider(
    <BiometricConsentProvider>
      <VbaVerificationPartners onBack={mockOnBack} onAgree={mockOnAgree} />
    </BiometricConsentProvider>,
  );

type GetByTestId = ReturnType<typeof renderScreen>['getByTestId'];

const tickBiometricConsent = (getByTestId: GetByTestId) =>
  fireEvent.press(
    getByTestId(VbaVerificationPartnersSelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX),
  );

// A 600pt viewport with the consent row (140pt tall) 900pt down the content.
const layOutScreen = (getByTestId: GetByTestId) => {
  fireEvent(
    getByTestId(VbaVerificationPartnersSelectorsIDs.CONTAINER),
    'layout',
    { nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 600 } } },
  );
  fireEvent(
    getByTestId(VbaVerificationPartnersSelectorsIDs.BIOMETRIC_CONSENT_ROW),
    'layout',
    { nativeEvent: { layout: { x: 16, y: 900, width: 368, height: 140 } } },
  );
};

const scrollContentTo = (getByTestId: GetByTestId, y: number) =>
  fireEvent.scroll(getByTestId(VbaVerificationPartnersSelectorsIDs.CONTAINER), {
    nativeEvent: {
      contentOffset: { x: 0, y },
      contentSize: { width: 400, height: 1100 },
      layoutMeasurement: { width: 400, height: 600 },
    },
  });

/** Lays the screen out and scrolls the consent row on screen. */
const revealConsent = (getByTestId: GetByTestId) => {
  layOutScreen(getByTestId);
  scrollContentTo(getByTestId, 400);
};

const SUMSUB_ACKNOWLEDGEMENT =
  'I acknowledge that my personal data will be processed as described in the Sumsub Notice of Personal Data Processing. Applicable to US residents only: I confirm that I have read the Privacy Notice and give my consent to the processing of my biometric information and biometric identifiers as described in the Sumsub Biometrics Processing Consent';
const BIOMETRIC_CONSENT =
  'I explicitly consent to idOS Association processing my facial images and the biometric data derived from them to verify my identity, as described in idOS Privacy Notice.';

// The consent sentence is hidden from screen readers (the checkbox carries
// it as its label), so queries for it and its link must include hidden
// elements.
const HIDDEN_FROM_SCREEN_READERS = { includeHiddenElements: true };

const identityTermsStatuses = () =>
  jest
    .mocked(trackVbaEvent)
    .mock.calls.filter(
      ([event]) => event.category === 'KYC Identity Terms Updated',
    )
    .map(([, buildProperties]) => buildProperties().status);

describe('VbaVerificationPartners', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKycSessionDisclaimers.mockReturnValue({
      disclaimers: legalCatalog,
      isLoading: false,
      error: null,
      retry: mockRetry,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders screen 2 of 2 with the partners, the Sumsub text and both consent lines', () => {
    const { getByText, getByTestId } = renderScreen();

    expect(
      getByTestId(VbaVerificationPartnersSelectorsIDs.STEP_COUNTER),
    ).toHaveTextContent('Step 2 of 2', { exact: true });
    [
      'Our verification partners',
      'idOS verifies your identity. idOS engages Sumsub to complete verification.',
      'Terms and privacy',
      'idOS',
      'Sumsub',
    ].forEach((text) => expect(getByText(text)).toBeOnTheScreen());
    expect(
      getByText(BIOMETRIC_CONSENT, HIDDEN_FROM_SCREEN_READERS),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VbaVerificationPartnersSelectorsIDs.SUMSUB_ACKNOWLEDGEMENT),
    ).toHaveTextContent(SUMSUB_ACKNOWLEDGEMENT, { exact: true });
    expect(
      getByTestId(VbaVerificationPartnersSelectorsIDs.IDOS_AGREEMENT),
    ).toHaveTextContent(
      'By tapping Agree and continue, I agree to idOS Terms and Conditions.',
      {
        exact: true,
      },
    );
    expect(
      getByTestId(VbaVerificationPartnersSelectorsIDs.AGREE_BUTTON),
    ).toHaveTextContent('Scroll to continue', { exact: true });
    expect(mockUseScreenPerformance).toHaveBeenCalledWith({
      config: KYC_SCREEN_PERFORMANCE_CONFIG,
      screenId: KYC_SCREEN_ID.PROVIDER_TERMS_MODAL,
      contentReady: true,
      contentState: KYC_SCREEN_CONTENT_STATE.POPULATED,
    });
  });

  it('lists only the idOS Privacy Policy and Transparency Document, in order with their labels', () => {
    const { getAllByTestId } = renderScreen();

    expect(
      getAllByTestId(
        new RegExp(`^${VbaVerificationPartnersSelectorsIDs.DISCLAIMER_LINK}-`),
      ).map((row) => within(row).getByText(/./).props.children),
    ).toEqual(['idOS Privacy Policy', 'idOS Transparency Document']);
  });

  it('leaves the idOS terms out of the card when it falls back to the backend titles', () => {
    mockUseKycSessionDisclaimers.mockReturnValue({
      disclaimers: [
        {
          id: 'idOS:end_user_agreement',
          key: 'end_user_agreement',
          version: '2',
          title: 'idOS End User Agreement v2',
          url: 'https://www.idos.network/legal/user-agreement-v2',
        },
        {
          id: 'idOS:renamed_policy',
          key: 'renamed_policy',
          version: '1',
          title: 'idOS Renamed Policy',
          url: 'https://www.idos.network/legal/renamed-policy',
        },
      ],
      isLoading: false,
      error: null,
      retry: mockRetry,
    });
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getAllByTestId, getByTestId } = renderScreen();

    expect(
      getAllByTestId(
        new RegExp(`^${VbaVerificationPartnersSelectorsIDs.DISCLAIMER_LINK}-`),
      ).map((row) => within(row).getByText(/./).props.children),
    ).toEqual(['idOS Renamed Policy']);
    fireEvent.press(
      getByTestId(VbaVerificationPartnersSelectorsIDs.IDOS_TERMS_LINK),
    );
    expect(openUrlSpy).toHaveBeenCalledWith(
      'https://www.idos.network/legal/user-agreement-v2',
    );
  });

  it('sets the Sumsub paragraph and its links one size below the consent sentence', () => {
    const { getByTestId, getByText } = renderScreen();
    const fontSizeOf = (text: { props: { style?: unknown } }) =>
      StyleSheet.flatten(text.props.style as StyleProp<TextStyle>)?.fontSize;
    const consentSize = fontSizeOf(
      getByText(BIOMETRIC_CONSENT, HIDDEN_FROM_SCREEN_READERS),
    );
    const paragraphTexts = [
      getByText(SUMSUB_ACKNOWLEDGEMENT),
      ...[
        VbaVerificationPartnersSelectorsIDs.SUMSUB_PERSONAL_DATA_PROCESSING_LINK,
        VbaVerificationPartnersSelectorsIDs.SUMSUB_PRIVACY_NOTICE_LINK,
        VbaVerificationPartnersSelectorsIDs.SUMSUB_BIOMETRICS_CONSENT_LINK,
      ].map((testID) => getByTestId(testID)),
    ];

    const sizes = new Set(paragraphTexts.map(fontSizeOf));
    expect(sizes.size).toBe(1);
    expect([...sizes][0]).toBeLessThan(consentSize as number);
  });

  it('opens every idOS and Sumsub link at its URL', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId } = renderScreen();
    const row = (key: string) =>
      `${VbaVerificationPartnersSelectorsIDs.DISCLAIMER_LINK}-idOS:${key}`;

    [
      row('privacy_policy'),
      row('transparency_document'),
      VbaVerificationPartnersSelectorsIDs.SUMSUB_PERSONAL_DATA_PROCESSING_LINK,
      VbaVerificationPartnersSelectorsIDs.SUMSUB_PRIVACY_NOTICE_LINK,
      VbaVerificationPartnersSelectorsIDs.SUMSUB_BIOMETRICS_CONSENT_LINK,
      VbaVerificationPartnersSelectorsIDs.BIOMETRIC_CONSENT_LINK,
      VbaVerificationPartnersSelectorsIDs.IDOS_TERMS_LINK,
    ].forEach((testID) =>
      fireEvent.press(getByTestId(testID, HIDDEN_FROM_SCREEN_READERS)),
    );

    expect(openUrlSpy.mock.calls).toEqual([
      ['https://www.idos.network/legal/privacy-policy'],
      ['https://www.idos.network/legal/transparency-document'],
      [SUMSUB_PERSONAL_DATA_PROCESSING_URL],
      [SUMSUB_PRIVACY_NOTICE_URL],
      [SUMSUB_BIOMETRICS_CONSENT_URL],
      [IDOS_PRIVACY_NOTICE_URL],
      ['https://www.idos.network/legal/user-agreement-v2'],
    ]);
    expect(mockOnAgree).not.toHaveBeenCalled();
  });

  it('falls back to the published idOS terms URL in the footer when the catalog has none', () => {
    mockUseKycSessionDisclaimers.mockReturnValue({
      disclaimers: legalCatalog.filter(
        (item) => item.id !== 'idOS:end_user_agreement',
      ),
      isLoading: false,
      error: null,
      retry: mockRetry,
    });
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId } = renderScreen();

    fireEvent.press(
      getByTestId(VbaVerificationPartnersSelectorsIDs.IDOS_TERMS_LINK),
    );

    expect(openUrlSpy).toHaveBeenCalledWith(IDOS_TERMS_URL);
  });

  describe('footer button states', () => {
    const footerButton = (getByTestId: GetByTestId) =>
      getByTestId(VbaVerificationPartnersSelectorsIDs.AGREE_BUTTON);

    it('reads a disabled Scroll to continue while the consent is below the fold', () => {
      const { getByTestId, getByRole } = renderScreen();
      layOutScreen(getByTestId);

      expect(footerButton(getByTestId)).toHaveTextContent(
        'Scroll to continue',
        { exact: true },
      );
      expect(footerButton(getByTestId)).toBeDisabled();
      expect(footerButton(getByTestId).props.accessibilityLabel).toBe(
        'Scroll to continue',
      );
      expect(
        getByRole('button', { name: 'Scroll to continue', disabled: true }),
      ).toBeOnTheScreen();
    });

    it('does not scroll or agree when pressed while disabled', () => {
      const scrollToSpy = jest.spyOn(ScrollView.prototype, 'scrollTo');
      const scrollToEndSpy = jest.spyOn(ScrollView.prototype, 'scrollToEnd');
      const { getByTestId } = renderScreen();
      layOutScreen(getByTestId);

      fireEvent.press(footerButton(getByTestId));

      expect(scrollToSpy).not.toHaveBeenCalled();
      expect(scrollToEndSpy).not.toHaveBeenCalled();
      expect(mockOnAgree).not.toHaveBeenCalled();
      expect(footerButton(getByTestId)).toHaveTextContent(
        'Scroll to continue',
        { exact: true },
      );
    });

    it('reads a disabled Agree to consent above once the consent is in view', () => {
      const { getByTestId, getByRole } = renderScreen();
      revealConsent(getByTestId);

      expect(footerButton(getByTestId)).toHaveTextContent(
        'Agree to consent above',
        { exact: true },
      );
      expect(footerButton(getByTestId)).toBeDisabled();
      expect(footerButton(getByTestId).props.accessibilityLabel).toBe(
        'Agree to consent above',
      );
      expect(
        getByRole('button', { name: 'Agree to consent above', disabled: true }),
      ).toBeOnTheScreen();
    });

    it('goes back to Scroll to continue when the consent scrolls off screen', () => {
      const { getByTestId } = renderScreen();
      revealConsent(getByTestId);

      scrollContentTo(getByTestId, 0);

      expect(footerButton(getByTestId)).toHaveTextContent(
        'Scroll to continue',
        { exact: true },
      );
      expect(footerButton(getByTestId)).toBeDisabled();
    });

    it('reads an enabled Agree and continue once ticked, wherever it is scrolled', () => {
      const { getByTestId, getByRole } = renderScreen();
      revealConsent(getByTestId);
      tickBiometricConsent(getByTestId);

      expect(footerButton(getByTestId)).toHaveTextContent(
        'Agree and continue',
        { exact: true },
      );
      expect(footerButton(getByTestId)).toBeEnabled();

      scrollContentTo(getByTestId, 0);

      expect(footerButton(getByTestId)).toHaveTextContent(
        'Agree and continue',
        { exact: true },
      );
      expect(footerButton(getByTestId)).toBeEnabled();
      expect(
        getByRole('button', { name: 'Agree and continue', disabled: false }),
      ).toBeOnTheScreen();
    });

    it('ignores a consent row measured while the terms were loading', () => {
      mockUseKycSessionDisclaimers.mockReturnValue({
        disclaimers: null,
        isLoading: true,
        error: null,
        retry: mockRetry,
      });
      const { getByTestId, rerender } = renderScreen();
      revealConsent(getByTestId);

      expect(footerButton(getByTestId)).toHaveTextContent(
        'Scroll to continue',
        { exact: true },
      );

      // The terms arrive; the row's last measurement was taken while loading.
      mockUseKycSessionDisclaimers.mockReturnValue({
        disclaimers: legalCatalog,
        isLoading: false,
        error: null,
        retry: mockRetry,
      });
      rerender(
        <BiometricConsentProvider>
          <VbaVerificationPartners onBack={mockOnBack} onAgree={mockOnAgree} />
        </BiometricConsentProvider>,
      );

      expect(footerButton(getByTestId)).toHaveTextContent(
        'Scroll to continue',
        { exact: true },
      );
    });
  });

  it('keeps Agree disabled until the biometric consent is ticked, then starts Sumsub', async () => {
    const { getByTestId } = renderScreen();
    revealConsent(getByTestId);
    const agree = getByTestId(VbaVerificationPartnersSelectorsIDs.AGREE_BUTTON);
    const checkbox = getByTestId(
      VbaVerificationPartnersSelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX,
    );

    expect(checkbox).not.toBeChecked();
    expect(agree).toBeDisabled();
    fireEvent.press(agree);
    expect(mockOnAgree).not.toHaveBeenCalled();

    tickBiometricConsent(getByTestId);
    expect(checkbox).toBeChecked();
    expect(agree).toBeEnabled();

    fireEvent.press(agree);
    await waitFor(() => expect(mockOnAgree).toHaveBeenCalledTimes(1));
  });

  it('disables Agree again when the consent is unticked', () => {
    const { getByTestId } = renderScreen();
    const agree = getByTestId(VbaVerificationPartnersSelectorsIDs.AGREE_BUTTON);

    tickBiometricConsent(getByTestId);
    tickBiometricConsent(getByTestId);

    expect(agree).toBeDisabled();
  });

  describe('biometric consent row', () => {
    const checkboxOf = (getByTestId: GetByTestId) =>
      getByTestId(
        VbaVerificationPartnersSelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX,
      );
    const isTicked = (getByTestId: GetByTestId) =>
      checkboxOf(getByTestId).props.accessibilityState.checked;

    it('links idOS Privacy Notice inside the consent sentence, with no separate link row', () => {
      const { getByTestId } = renderScreen();
      const sentence = getByTestId(
        VbaVerificationPartnersSelectorsIDs.BIOMETRIC_CONSENT_LABEL,
        HIDDEN_FROM_SCREEN_READERS,
      );

      expect(sentence).toHaveTextContent(BIOMETRIC_CONSENT, { exact: true });
      expect(
        within(sentence).getByTestId(
          VbaVerificationPartnersSelectorsIDs.BIOMETRIC_CONSENT_LINK,
          HIDDEN_FROM_SCREEN_READERS,
        ),
      ).toHaveTextContent('idOS Privacy Notice', { exact: true });
    });

    it('opens the idOS Privacy Notice from the inline link without ticking the consent', () => {
      const openUrlSpy = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue(undefined);
      const { getByTestId } = renderScreen();
      revealConsent(getByTestId);

      fireEvent.press(
        getByTestId(
          VbaVerificationPartnersSelectorsIDs.BIOMETRIC_CONSENT_LINK,
          HIDDEN_FROM_SCREEN_READERS,
        ),
      );

      expect(openUrlSpy.mock.calls).toEqual([[IDOS_PRIVACY_NOTICE_URL]]);
      expect(isTicked(getByTestId)).toBe(false);
      expect(
        getByTestId(VbaVerificationPartnersSelectorsIDs.AGREE_BUTTON),
      ).toBeDisabled();
    });

    it('toggles the consent from the checkbox', () => {
      const { getByTestId } = renderScreen();

      fireEvent.press(checkboxOf(getByTestId));
      expect(isTicked(getByTestId)).toBe(true);
      fireEvent.press(checkboxOf(getByTestId));
      expect(isTicked(getByTestId)).toBe(false);
    });

    it('toggles the consent from the plain words of the sentence', () => {
      const openUrlSpy = jest.spyOn(Linking, 'openURL');
      const { getByTestId } = renderScreen();
      const sentence = getByTestId(
        VbaVerificationPartnersSelectorsIDs.BIOMETRIC_CONSENT_LABEL,
        HIDDEN_FROM_SCREEN_READERS,
      );

      fireEvent.press(sentence);
      expect(isTicked(getByTestId)).toBe(true);
      fireEvent.press(sentence);
      expect(isTicked(getByTestId)).toBe(false);
      expect(openUrlSpy).not.toHaveBeenCalled();
    });

    it('is one checkbox for screen readers, labelled with the whole sentence, with the link as an action', () => {
      const openUrlSpy = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue(undefined);
      const { getByTestId, getByRole } = renderScreen();
      const checkbox = checkboxOf(getByTestId);

      expect(getByRole('checkbox', { name: BIOMETRIC_CONSENT })).toBe(checkbox);
      expect(checkbox.props.accessibilityLabel).toBe(BIOMETRIC_CONSENT);
      expect(checkbox.props.accessibilityActions).toEqual([
        {
          name: 'openPrivacyNotice',
          label: 'idOS Privacy Notice, Opens in your browser',
        },
      ]);
      // The sentence repeats the label, so screen readers skip it.
      expect(
        getByTestId(
          VbaVerificationPartnersSelectorsIDs.BIOMETRIC_CONSENT_LABEL,
          HIDDEN_FROM_SCREEN_READERS,
        ).props,
      ).toMatchObject({
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants',
      });

      fireEvent(checkbox, 'accessibilityAction', {
        nativeEvent: { actionName: 'openPrivacyNotice' },
      });

      expect(openUrlSpy.mock.calls).toEqual([[IDOS_PRIVACY_NOTICE_URL]]);
      expect(isTicked(getByTestId)).toBe(false);
    });
  });

  it('shows Agree loading while the session terms load', () => {
    mockUseKycSessionDisclaimers.mockReturnValue({
      disclaimers: null,
      isLoading: true,
      error: null,
      retry: mockRetry,
    });
    const { getByTestId } = renderScreen();
    tickBiometricConsent(getByTestId);

    expect(
      getByTestId(VbaVerificationPartnersSelectorsIDs.AGREE_BUTTON),
    ).toBeDisabled();
    expect(mockUseScreenPerformance).toHaveBeenLastCalledWith(
      expect.objectContaining({ contentReady: false }),
    );
  });

  it('shows the error with retry, keeps Agree disabled and tracks failed when the terms fail to load', () => {
    mockUseKycSessionDisclaimers.mockReturnValue({
      disclaimers: null,
      isLoading: false,
      error: 'Request timed out',
      retry: mockRetry,
    });
    const { getByTestId } = renderScreen();
    tickBiometricConsent(getByTestId);

    expect(
      getByTestId(VbaVerificationPartnersSelectorsIDs.DISCLAIMERS_ERROR),
    ).toHaveTextContent("Couldn't load the terms and conditions. Try again");
    expect(
      getByTestId(VbaVerificationPartnersSelectorsIDs.AGREE_BUTTON),
    ).toBeDisabled();
    fireEvent.press(
      getByTestId(VbaVerificationPartnersSelectorsIDs.DISCLAIMERS_RETRY),
    );
    expect(mockRetry).toHaveBeenCalledTimes(1);
    expect(identityTermsStatuses()).toStrictEqual(['failed']);
    expect(mockUseScreenPerformance).toHaveBeenLastCalledWith(
      expect.objectContaining({
        contentState: KYC_SCREEN_CONTENT_STATE.ERROR,
      }),
    );
  });

  it('tracks accepted before starting Sumsub', async () => {
    const { getByTestId } = renderScreen();
    tickBiometricConsent(getByTestId);

    fireEvent.press(
      getByTestId(VbaVerificationPartnersSelectorsIDs.AGREE_BUTTON),
    );

    await waitFor(() => expect(mockOnAgree).toHaveBeenCalled());
    expect(identityTermsStatuses()).toStrictEqual(['accepted']);
    expect(
      jest.mocked(trackVbaEvent).mock.invocationCallOrder.at(-1),
    ).toBeLessThan(mockOnAgree.mock.invocationCallOrder[0]);
  });

  it('goes back to screen 1 from the header without agreeing', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(
      getByTestId(VbaVerificationPartnersSelectorsIDs.BACK_BUTTON),
    );

    expect(mockOnBack).toHaveBeenCalledTimes(1);
    expect(mockOnAgree).not.toHaveBeenCalled();
    expect(identityTermsStatuses()).toStrictEqual([]);
  });
});
