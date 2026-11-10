import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import KycPartnerTerms from './PartnerTerms';
import { KycPartnerTermsSelectorsIDs } from './VerifyIdentity.testIds';
import type { KycCatalogDisclaimerLink } from '../../hooks/useKycSessionDisclaimers';
import { trackKycEvent } from '../../utils/trackKycEvent';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  KYC_SCREEN_ID,
  KYC_SCREEN_PERFORMANCE_CONFIG,
} from '../../kycScreenPerformance';

jest.mock('../../utils/trackKycEvent', () => ({
  trackKycEvent: jest.fn(),
}));

jest.mock('../../../../../hooks/useScreenPerformance');
const mockUseScreenPerformance = jest.mocked(useScreenPerformance);

const mockOnAgree = jest.fn();
const mockOnBack = jest.fn();

const IDOS_TERMS: KycCatalogDisclaimerLink = {
  id: 'idOS:idos-terms',
  key: 'idos-terms-and-conditions',
  version: '1',
  title: 'idOS Terms and Conditions',
  url: 'https://idos.example/terms',
};
const IDOS_PRIVACY: KycCatalogDisclaimerLink = {
  id: 'idOS:idos-privacy',
  key: 'idos-privacy-policy',
  version: '1',
  title: 'idOS Privacy Policy',
  url: 'https://idos.example/privacy',
};
const IDOS_PRIVACY_NOTICE: KycCatalogDisclaimerLink = {
  id: 'idOS:idos-privacy-notice',
  key: 'idos-privacy-notice',
  version: '1',
  title: 'idOS Privacy Notice',
  url: 'https://idos.example/privacy-notice',
};
const IDOS_TRANSPARENCY: KycCatalogDisclaimerLink = {
  id: 'idOS:idos-transparency',
  key: 'idos-transparency-document',
  version: '1',
  title: 'idOS Transparency Document',
  url: 'https://idos.example/transparency',
};
const SUMSUB_NOTICE: KycCatalogDisclaimerLink = {
  id: 'kycProvider:sumsub-notice',
  key: 'sumsub-notice',
  version: '2',
  title: 'Sumsub Notice of Personal Data Processing',
  url: 'https://sumsub.example/notice',
};

const DISCLAIMERS = [
  IDOS_TERMS,
  IDOS_PRIVACY,
  IDOS_PRIVACY_NOTICE,
  IDOS_TRANSPARENCY,
  SUMSUB_NOTICE,
];

const renderScreen = (
  disclaimers: KycCatalogDisclaimerLink[] = DISCLAIMERS,
  location?: string,
  kycState?: {
    geoCountry: string | null;
    sessionStatus: { id: string; finalStatus: string } | null;
  },
) =>
  renderWithProvider(
    <KycPartnerTerms
      disclaimers={disclaimers}
      onAgree={mockOnAgree}
      onBack={mockOnBack}
    />,
    location || kycState
      ? {
          state: {
            engine: {
              backgroundState: {
                ...(location ? { GeolocationController: { location } } : {}),
                ...(kycState ? { KycController: kycState } : {}),
              },
            },
          },
        }
      : undefined,
  );

const consent = (getByTestId: ReturnType<typeof renderScreen>['getByTestId']) =>
  fireEvent(
    getByTestId(KycPartnerTermsSelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX),
    'change',
    true,
  );

const scrollConsentIntoView = (
  getByTestId: ReturnType<typeof renderScreen>['getByTestId'],
) => {
  fireEvent(getByTestId(KycPartnerTermsSelectorsIDs.CONTAINER), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 200 } },
  });
  fireEvent(
    getByTestId(KycPartnerTermsSelectorsIDs.BIOMETRIC_CONSENT_ROW),
    'layout',
    { nativeEvent: { layout: { x: 0, y: 800, width: 300, height: 80 } } },
  );
  fireEvent.scroll(getByTestId(KycPartnerTermsSelectorsIDs.CONTAINER), {
    nativeEvent: {
      contentOffset: { y: 700 },
      layoutMeasurement: { height: 200, width: 300 },
      contentSize: { height: 1000, width: 300 },
    },
  });
};

describe('KycPartnerTerms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the partner copy and the terms section', () => {
    const { getByText } = renderScreen();

    expect(getByText('Our verification partners')).toBeOnTheScreen();
    expect(
      getByText(
        'idOS verifies your identity. idOS engages Sumsub to complete verification.',
      ),
    ).toBeOnTheScreen();
    expect(getByText('Terms and privacy')).toBeOnTheScreen();
    expect(getByText('idOS')).toBeOnTheScreen();
    expect(getByText('Sumsub')).toBeOnTheScreen();
    expect(mockUseScreenPerformance).toHaveBeenCalledWith({
      config: KYC_SCREEN_PERFORMANCE_CONFIG,
      screenId: KYC_SCREEN_ID.PROVIDER_TERMS_MODAL,
      contentReady: true,
    });
  });

  it('shows the second page of two above the title', () => {
    const { getByTestId } = renderScreen();

    const indicator = getByTestId(KycPartnerTermsSelectorsIDs.STEP_INDICATOR);
    expect(indicator).toHaveTextContent('Step 2 of 2');
    expect(indicator.props.accessibilityLabel).toBe('Step 2 of 2');
  });

  it('lists the idOS privacy policy and transparency document', () => {
    const { getByTestId, queryByTestId } = renderScreen();

    const rowFor = (disclaimer: KycCatalogDisclaimerLink) =>
      getByTestId(
        `${KycPartnerTermsSelectorsIDs.DISCLAIMER_LINK}-${disclaimer.id}`,
      );

    expect(rowFor(IDOS_PRIVACY)).toHaveTextContent('idOS Privacy Policy');
    expect(rowFor(IDOS_TRANSPARENCY)).toHaveTextContent(
      'idOS Transparency Document',
    );
    expect(
      queryByTestId(
        `${KycPartnerTermsSelectorsIDs.DISCLAIMER_LINK}-${IDOS_TERMS.id}`,
      ),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(
        `${KycPartnerTermsSelectorsIDs.DISCLAIMER_LINK}-${IDOS_PRIVACY_NOTICE.id}`,
      ),
    ).not.toBeOnTheScreen();
  });

  it('opens each idOS document URL from its row', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId } = renderScreen();

    fireEvent.press(
      getByTestId(
        `${KycPartnerTermsSelectorsIDs.DISCLAIMER_LINK}-idOS:idos-privacy`,
      ),
    );

    expect(openUrlSpy).toHaveBeenCalledWith('https://idos.example/privacy');
  });

  it('links the Sumsub notice inline in the acknowledgement', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId, queryByText } = renderScreen();

    expect(
      getByTestId(KycPartnerTermsSelectorsIDs.SUMSUB_ACKNOWLEDGEMENT),
    ).toHaveTextContent(
      'I acknowledge that my personal data will be processed as described in the Sumsub Notice of Personal Data Processing.',
    );
    expect(queryByText(/Applicable to US residents only/)).toBeNull();

    fireEvent.press(
      getByTestId(KycPartnerTermsSelectorsIDs.SUMSUB_NOTICE_LINK),
    );
    expect(openUrlSpy).toHaveBeenCalledWith('https://sumsub.example/notice');
  });

  it('falls back to the Sumsub notice URL when the catalog has no match', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId } = renderScreen([
      IDOS_TERMS,
      IDOS_PRIVACY_NOTICE,
      IDOS_TRANSPARENCY,
    ]);

    fireEvent.press(
      getByTestId(KycPartnerTermsSelectorsIDs.SUMSUB_NOTICE_LINK),
    );

    expect(openUrlSpy).toHaveBeenCalledWith(
      'https://sumsub.com/notification-to-processing-of-personal-data/',
    );
  });

  it('adds the US residents acknowledgement only for a US geolocation', () => {
    const { getByTestId } = renderScreen(DISCLAIMERS, 'US-NY');

    expect(
      getByTestId(KycPartnerTermsSelectorsIDs.SUMSUB_ACKNOWLEDGEMENT),
    ).toHaveTextContent(
      'I acknowledge that my personal data will be processed as described in the Sumsub Notice of Personal Data Processing. Applicable to US residents only: I confirm that I have read the Privacy Notice and give my consent to the processing of my biometric information and biometric identifiers as described in the Sumsub Biometrics Processing Consent.',
    );
  });

  it('keeps the US acknowledgement for a stored USA session on a Swedish IP', () => {
    const { getByTestId } = renderScreen(DISCLAIMERS, 'SE', {
      geoCountry: 'USA',
      sessionStatus: { id: 'session-1', finalStatus: 'pending' },
    });

    expect(
      getByTestId(KycPartnerTermsSelectorsIDs.SUMSUB_ACKNOWLEDGEMENT),
    ).toHaveTextContent(/Applicable to US residents only/u);
  });

  it('hides the US acknowledgement for a stored non-US session on a US IP', () => {
    const { getByTestId } = renderScreen(DISCLAIMERS, 'US-NY', {
      geoCountry: 'BRA',
      sessionStatus: { id: 'session-1', finalStatus: 'pending' },
    });

    expect(
      getByTestId(KycPartnerTermsSelectorsIDs.SUMSUB_ACKNOWLEDGEMENT),
    ).not.toHaveTextContent(/Applicable to US residents only/u);
  });

  it('follows the IP when geoCountry is set without a stored session', () => {
    const { getByTestId } = renderScreen(DISCLAIMERS, 'SE', {
      geoCountry: 'USA',
      sessionStatus: null,
    });

    expect(
      getByTestId(KycPartnerTermsSelectorsIDs.SUMSUB_ACKNOWLEDGEMENT),
    ).not.toHaveTextContent(/Applicable to US residents only/u);
  });

  it('links the US privacy notice even when the catalog has no Sumsub privacy document', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId } = renderScreen(DISCLAIMERS, 'US-NY');

    fireEvent.press(
      getByTestId(KycPartnerTermsSelectorsIDs.SUMSUB_PRIVACY_NOTICE_LINK),
    );

    expect(openUrlSpy).toHaveBeenCalledWith(
      'https://sumsub.com/privacy-notice-service/',
    );
  });

  it('renders further provider documents as rows so none is dropped', () => {
    const extraProviderDocument: KycCatalogDisclaimerLink = {
      id: 'kycProvider:sumsub-terms',
      key: 'sumsub-terms',
      version: '1',
      title: 'Sumsub Terms of Service',
      url: 'https://sumsub.example/terms',
    };
    const { getByText } = renderScreen([...DISCLAIMERS, extraProviderDocument]);

    expect(getByText('Sumsub Terms of Service')).toBeOnTheScreen();
  });

  it('lists Sumsub privacy and biometrics as rows for non-US residents', () => {
    const sumsubPrivacy: KycCatalogDisclaimerLink = {
      id: 'kycProvider:sumsub-privacy',
      key: 'sumsub-privacy-notice',
      version: '1',
      title: 'Sumsub Privacy Notice',
      url: 'https://sumsub.example/privacy',
    };
    const sumsubBiometrics: KycCatalogDisclaimerLink = {
      id: 'kycProvider:sumsub-biometrics',
      key: 'sumsub-biometrics-consent',
      version: '1',
      title: 'Sumsub Biometrics Processing Consent',
      url: 'https://sumsub.example/biometrics',
    };
    const { getByTestId, queryByTestId } = renderScreen([
      ...DISCLAIMERS,
      sumsubPrivacy,
      sumsubBiometrics,
    ]);

    expect(
      getByTestId(
        `${KycPartnerTermsSelectorsIDs.DISCLAIMER_LINK}-${sumsubPrivacy.id}`,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        `${KycPartnerTermsSelectorsIDs.DISCLAIMER_LINK}-${sumsubBiometrics.id}`,
      ),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(KycPartnerTermsSelectorsIDs.SUMSUB_PRIVACY_NOTICE_LINK),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(KycPartnerTermsSelectorsIDs.SUMSUB_BIOMETRICS_LINK),
    ).not.toBeOnTheScreen();
  });

  it('keeps Sumsub privacy and biometrics in the US sentence, not as rows', () => {
    const sumsubPrivacy: KycCatalogDisclaimerLink = {
      id: 'kycProvider:sumsub-privacy',
      key: 'sumsub-privacy-notice',
      version: '1',
      title: 'Sumsub Privacy Notice',
      url: 'https://sumsub.example/privacy',
    };
    const sumsubBiometrics: KycCatalogDisclaimerLink = {
      id: 'kycProvider:sumsub-biometrics',
      key: 'sumsub-biometrics-consent',
      version: '1',
      title: 'Sumsub Biometrics Processing Consent',
      url: 'https://sumsub.example/biometrics',
    };
    const { getByTestId, queryByTestId } = renderScreen(
      [...DISCLAIMERS, sumsubPrivacy, sumsubBiometrics],
      'US-CA',
    );

    expect(
      getByTestId(KycPartnerTermsSelectorsIDs.SUMSUB_PRIVACY_NOTICE_LINK),
    ).toBeOnTheScreen();
    expect(
      getByTestId(KycPartnerTermsSelectorsIDs.SUMSUB_BIOMETRICS_LINK),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(
        `${KycPartnerTermsSelectorsIDs.DISCLAIMER_LINK}-${sumsubPrivacy.id}`,
      ),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(
        `${KycPartnerTermsSelectorsIDs.DISCLAIMER_LINK}-${sumsubBiometrics.id}`,
      ),
    ).not.toBeOnTheScreen();
  });

  it('links the biometric consent to the idOS privacy notice, not the policy', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId, getByText } = renderScreen();

    expect(
      getByTestId(KycPartnerTermsSelectorsIDs.BIOMETRIC_CONSENT),
    ).toHaveTextContent(
      'I explicitly consent to idOS Association processing my facial images and the biometric data derived from them to verify my identity, as described in idOS Privacy Notice.',
    );
    // Policy stays listed as a row; notice is reserved for the sentence link.
    expect(getByText('idOS Privacy Policy')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(KycPartnerTermsSelectorsIDs.BIOMETRIC_CONSENT_LINK),
    );
    expect(openUrlSpy).toHaveBeenCalledWith(
      'https://idos.example/privacy-notice',
    );
    expect(
      getByTestId(KycPartnerTermsSelectorsIDs.AGREE_BUTTON),
    ).toBeDisabled();
  });

  it('toggles the consent when the sentence is pressed', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(KycPartnerTermsSelectorsIDs.BIOMETRIC_CONSENT));

    expect(getByTestId(KycPartnerTermsSelectorsIDs.AGREE_BUTTON)).toBeEnabled();
  });

  it('keeps the consent sentence readable when no idOS privacy document matches', () => {
    const { getByTestId, queryByTestId } = renderScreen([
      IDOS_TERMS,
      SUMSUB_NOTICE,
    ]);

    expect(
      getByTestId(KycPartnerTermsSelectorsIDs.BIOMETRIC_CONSENT),
    ).toHaveTextContent(
      'I explicitly consent to idOS Association processing my facial images and the biometric data derived from them to verify my identity, as described in idOS Privacy Notice.',
    );
    expect(
      queryByTestId(KycPartnerTermsSelectorsIDs.BIOMETRIC_CONSENT_LINK),
    ).not.toBeOnTheScreen();
  });

  it('links the footer agreement to the idOS terms document', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId } = renderScreen();

    expect(
      getByTestId(KycPartnerTermsSelectorsIDs.AGREEMENT),
    ).toHaveTextContent(
      'By tapping Agree and continue, I agree to idOS Terms and Conditions.',
    );

    fireEvent.press(
      getByTestId(KycPartnerTermsSelectorsIDs.AGREEMENT_TERMS_LINK),
    );
    expect(openUrlSpy).toHaveBeenCalledWith('https://idos.example/terms');
  });

  it('names the next step from whether the consent is on screen', () => {
    const { getByTestId } = renderScreen();
    const button = () => getByTestId(KycPartnerTermsSelectorsIDs.AGREE_BUTTON);

    expect(button()).toHaveProp('accessibilityLabel', 'Scroll to continue');
    expect(button()).toBeDisabled();

    scrollConsentIntoView(getByTestId);
    expect(button()).toHaveProp('accessibilityLabel', 'Agree to consent above');
    expect(button()).toBeDisabled();

    consent(getByTestId);
    expect(button()).toHaveProp('accessibilityLabel', 'Agree and continue');
    expect(button()).toBeEnabled();
  });

  it('does not advance while the consent is unchecked', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(KycPartnerTermsSelectorsIDs.AGREE_BUTTON));

    expect(mockOnAgree).not.toHaveBeenCalled();
  });

  it('advances once the consent is given and Agree is pressed', () => {
    const { getByTestId } = renderScreen();

    consent(getByTestId);
    fireEvent.press(getByTestId(KycPartnerTermsSelectorsIDs.AGREE_BUTTON));

    expect(mockOnAgree).toHaveBeenCalledTimes(1);
  });

  it('goes back when the header back button is pressed', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(KycPartnerTermsSelectorsIDs.BACK_BUTTON));

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  describe('analytics', () => {
    const identityTermsStatuses = () =>
      jest
        .mocked(trackKycEvent)
        .mock.calls.filter(
          ([event]) => event.category === 'KYC Identity Terms Updated',
        )
        .map(([, buildProperties]) => buildProperties().status);

    it('tracks page2_viewed once when the page opens', () => {
      renderScreen();

      expect(identityTermsStatuses()).toStrictEqual(['page2_viewed']);
    });

    it('tracks page2_accepted before advancing', () => {
      const { getByTestId } = renderScreen();

      consent(getByTestId);
      fireEvent.press(getByTestId(KycPartnerTermsSelectorsIDs.AGREE_BUTTON));

      expect(identityTermsStatuses()).toStrictEqual([
        'page2_viewed',
        'page2_accepted',
      ]);
      expect(
        jest.mocked(trackKycEvent).mock.invocationCallOrder.at(-1),
      ).toBeLessThan(mockOnAgree.mock.invocationCallOrder[0]);
    });

    it('does not track acceptance when the consent is never given', () => {
      const { getByTestId } = renderScreen();

      fireEvent.press(getByTestId(KycPartnerTermsSelectorsIDs.AGREE_BUTTON));

      expect(identityTermsStatuses()).toStrictEqual(['page2_viewed']);
    });
  });
});
