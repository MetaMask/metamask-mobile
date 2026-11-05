import React from 'react';
import { Linking, ScrollView } from 'react-native';
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
      BIOMETRIC_CONSENT,
    ].forEach((text) => expect(getByText(text)).toBeOnTheScreen());
    expect(
      getByTestId(VbaVerificationPartnersSelectorsIDs.SUMSUB_ACKNOWLEDGEMENT),
    ).toHaveTextContent(SUMSUB_ACKNOWLEDGEMENT, { exact: true });
    expect(
      getByTestId(VbaVerificationPartnersSelectorsIDs.IDOS_AGREEMENT),
    ).toHaveTextContent(
      'By tapping Agree, I agree to idOS Terms and Conditions.',
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

  it('lists only the three idOS documents, in order with their labels', () => {
    const { getAllByTestId } = renderScreen();

    expect(
      getAllByTestId(
        new RegExp(`^${VbaVerificationPartnersSelectorsIDs.DISCLAIMER_LINK}-`),
      ).map((row) => within(row).getByText(/./).props.children),
    ).toEqual([
      'idOS Terms and Conditions',
      'idOS Privacy Policy',
      'idOS Transparency Document',
    ]);
  });

  it('opens every idOS and Sumsub link at its URL', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId } = renderScreen();
    const row = (key: string) =>
      `${VbaVerificationPartnersSelectorsIDs.DISCLAIMER_LINK}-idOS:${key}`;

    [
      row('end_user_agreement'),
      row('privacy_policy'),
      row('transparency_document'),
      VbaVerificationPartnersSelectorsIDs.SUMSUB_PERSONAL_DATA_PROCESSING_LINK,
      VbaVerificationPartnersSelectorsIDs.SUMSUB_PRIVACY_NOTICE_LINK,
      VbaVerificationPartnersSelectorsIDs.SUMSUB_BIOMETRICS_CONSENT_LINK,
      VbaVerificationPartnersSelectorsIDs.BIOMETRIC_CONSENT_LINK,
      VbaVerificationPartnersSelectorsIDs.IDOS_TERMS_LINK,
    ].forEach((testID) => fireEvent.press(getByTestId(testID)));

    expect(openUrlSpy.mock.calls).toEqual([
      ['https://www.idos.network/legal/user-agreement-v2'],
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

  describe('Scroll to continue', () => {
    const footerButton = (getByTestId: GetByTestId) =>
      getByTestId(VbaVerificationPartnersSelectorsIDs.AGREE_BUTTON);

    it('labels the enabled footer button Scroll to continue while the consent is off screen', () => {
      const { getByTestId, getByRole } = renderScreen();
      layOutScreen(getByTestId);

      expect(footerButton(getByTestId)).toHaveTextContent(
        'Scroll to continue',
        { exact: true },
      );
      expect(footerButton(getByTestId)).toBeEnabled();
      expect(
        getByRole('button', { name: 'Scroll to continue' }),
      ).toBeOnTheScreen();
    });

    it('scrolls the consent row into view when pressed, without agreeing', () => {
      const { getByTestId, UNSAFE_getByType } = renderScreen();
      const scrollToSpy = jest.spyOn(
        UNSAFE_getByType(ScrollView).instance,
        'scrollTo',
      );
      layOutScreen(getByTestId);

      fireEvent.press(footerButton(getByTestId));

      // Row bottom (900 + 140) plus a 16pt margin, less the 600pt viewport.
      expect(scrollToSpy).toHaveBeenCalledWith({ y: 456, animated: true });
      expect(mockOnAgree).not.toHaveBeenCalled();
    });

    it('scrolls to the end when pressed before the consent row is measured', () => {
      const { getByTestId, UNSAFE_getByType } = renderScreen();
      const scrollToEndSpy = jest.spyOn(
        UNSAFE_getByType(ScrollView).instance,
        'scrollToEnd',
      );

      fireEvent.press(footerButton(getByTestId));

      expect(scrollToEndSpy).toHaveBeenCalledWith({ animated: true });
    });

    it('switches to a disabled Agree once the consent has scrolled into view', () => {
      const { getByTestId, getByRole } = renderScreen();
      revealConsent(getByTestId);

      expect(footerButton(getByTestId)).toHaveTextContent('Agree', {
        exact: true,
      });
      expect(footerButton(getByTestId)).toBeDisabled();
      expect(getByRole('button', { name: 'Agree' })).toBeOnTheScreen();
    });

    it('stays on Agree when the consent scrolls back off screen', () => {
      const { getByTestId } = renderScreen();
      revealConsent(getByTestId);

      scrollContentTo(getByTestId, 0);

      expect(footerButton(getByTestId)).toHaveTextContent('Agree', {
        exact: true,
      });
    });

    it('keeps Scroll to continue while the terms load, even with the consent row on screen', () => {
      mockUseKycSessionDisclaimers.mockReturnValue({
        disclaimers: null,
        isLoading: true,
        error: null,
        retry: mockRetry,
      });
      const { getByTestId } = renderScreen();
      revealConsent(getByTestId);

      expect(footerButton(getByTestId)).toHaveTextContent(
        'Scroll to continue',
        { exact: true },
      );
    });

    it('switches to an enabled Agree when the consent is ticked', () => {
      const { getByTestId } = renderScreen();
      layOutScreen(getByTestId);

      tickBiometricConsent(getByTestId);

      expect(footerButton(getByTestId)).toHaveTextContent('Agree', {
        exact: true,
      });
      expect(footerButton(getByTestId)).toBeEnabled();
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

  it('does not tick the consent when its idOS Privacy Notice link is opened', () => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const { getByTestId } = renderScreen();
    revealConsent(getByTestId);

    fireEvent.press(
      getByTestId(VbaVerificationPartnersSelectorsIDs.BIOMETRIC_CONSENT_LINK),
    );

    expect(
      getByTestId(VbaVerificationPartnersSelectorsIDs.AGREE_BUTTON),
    ).toBeDisabled();
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
