import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaPartnerTerms from './PartnerTerms';
import { VbaPartnerTermsSelectorsIDs } from './VerifyIdentity.testIds';
import type { KycCatalogDisclaimerLink } from '../../hooks/useKycSessionDisclaimers';
import { trackVbaEvent } from '../../../Ramp/Views/VirtualBankAccount/vbaAnalytics';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  KYC_SCREEN_ID,
  KYC_SCREEN_PERFORMANCE_CONFIG,
} from '../../kycScreenPerformance';

jest.mock('../../../Ramp/Views/VirtualBankAccount/vbaAnalytics', () => ({
  ...jest.requireActual('../../../Ramp/Views/VirtualBankAccount/vbaAnalytics'),
  trackVbaEvent: jest.fn(),
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
  IDOS_TRANSPARENCY,
  SUMSUB_NOTICE,
];

const renderScreen = (disclaimers: KycCatalogDisclaimerLink[] = DISCLAIMERS) =>
  renderWithProvider(
    <VbaPartnerTerms
      disclaimers={disclaimers}
      onAgree={mockOnAgree}
      onBack={mockOnBack}
    />,
  );

const consent = (getByTestId: ReturnType<typeof renderScreen>['getByTestId']) =>
  fireEvent(
    getByTestId(VbaPartnerTermsSelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX),
    'change',
    true,
  );

describe('VbaPartnerTerms', () => {
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

  it('shows the second page of two in the header', () => {
    const { getByTestId } = renderScreen();

    const indicator = getByTestId(VbaPartnerTermsSelectorsIDs.STEP_INDICATOR);
    expect(indicator).toHaveTextContent('2 of 2');
    expect(indicator.props.accessibilityLabel).toBe('Step 2 of 2');
  });

  it('lists every idOS document from the catalog', () => {
    const { getByTestId } = renderScreen();

    const rowFor = (disclaimer: KycCatalogDisclaimerLink) =>
      getByTestId(
        `${VbaPartnerTermsSelectorsIDs.DISCLAIMER_LINK}-${disclaimer.id}`,
      );

    expect(rowFor(IDOS_TERMS)).toHaveTextContent('idOS Terms and Conditions');
    expect(rowFor(IDOS_PRIVACY)).toHaveTextContent('idOS Privacy Policy');
    expect(rowFor(IDOS_TRANSPARENCY)).toHaveTextContent(
      'idOS Transparency Document',
    );
  });

  it('opens each idOS document URL from its row', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId } = renderScreen();

    fireEvent.press(
      getByTestId(
        `${VbaPartnerTermsSelectorsIDs.DISCLAIMER_LINK}-idOS:idos-privacy`,
      ),
    );

    expect(openUrlSpy).toHaveBeenCalledWith('https://idos.example/privacy');
  });

  it('links the Sumsub notice inline in the acknowledgement', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId } = renderScreen();

    expect(
      getByTestId(VbaPartnerTermsSelectorsIDs.SUMSUB_ACKNOWLEDGEMENT),
    ).toHaveTextContent(
      'I acknowledge that my personal data will be processed as described in the Sumsub Notice of Personal Data Processing.',
    );

    fireEvent.press(
      getByTestId(VbaPartnerTermsSelectorsIDs.SUMSUB_NOTICE_LINK),
    );
    expect(openUrlSpy).toHaveBeenCalledWith('https://sumsub.example/notice');
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

  it('links the biometric consent to the matching idOS privacy document', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId } = renderScreen();

    expect(
      getByTestId(VbaPartnerTermsSelectorsIDs.BIOMETRIC_CONSENT),
    ).toHaveTextContent(
      'I explicitly consent to idOS Association processing my facial images and the biometric data derived from them to verify my identity, as described in idOS Privacy Notice.',
    );

    fireEvent.press(
      getByTestId(VbaPartnerTermsSelectorsIDs.BIOMETRIC_CONSENT_LINK),
    );
    expect(openUrlSpy).toHaveBeenCalledWith('https://idos.example/privacy');
  });

  it('keeps the consent sentence readable when no idOS privacy document matches', () => {
    const { getByTestId, queryByTestId } = renderScreen([
      IDOS_TERMS,
      SUMSUB_NOTICE,
    ]);

    expect(
      getByTestId(VbaPartnerTermsSelectorsIDs.BIOMETRIC_CONSENT),
    ).toHaveTextContent(
      'I explicitly consent to idOS Association processing my facial images and the biometric data derived from them to verify my identity, as described in idOS Privacy Notice.',
    );
    expect(
      queryByTestId(VbaPartnerTermsSelectorsIDs.BIOMETRIC_CONSENT_LINK),
    ).not.toBeOnTheScreen();
  });

  it('links the footer agreement to the idOS terms document', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId } = renderScreen();

    expect(
      getByTestId(VbaPartnerTermsSelectorsIDs.AGREEMENT),
    ).toHaveTextContent(
      'By tapping Agree, I agree to the idOS Terms and Conditions.',
    );

    fireEvent.press(
      getByTestId(VbaPartnerTermsSelectorsIDs.AGREEMENT_TERMS_LINK),
    );
    expect(openUrlSpy).toHaveBeenCalledWith('https://idos.example/terms');
  });

  it('keeps Agree disabled until the biometric consent is given', () => {
    const { getByTestId } = renderScreen();

    expect(
      getByTestId(VbaPartnerTermsSelectorsIDs.AGREE_BUTTON),
    ).toBeDisabled();

    consent(getByTestId);

    expect(getByTestId(VbaPartnerTermsSelectorsIDs.AGREE_BUTTON)).toBeEnabled();
  });

  it('does not advance while the consent is unchecked', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(VbaPartnerTermsSelectorsIDs.AGREE_BUTTON));

    expect(mockOnAgree).not.toHaveBeenCalled();
  });

  it('advances once the consent is given and Agree is pressed', () => {
    const { getByTestId } = renderScreen();

    consent(getByTestId);
    fireEvent.press(getByTestId(VbaPartnerTermsSelectorsIDs.AGREE_BUTTON));

    expect(mockOnAgree).toHaveBeenCalledTimes(1);
  });

  it('goes back when the header back button is pressed', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(VbaPartnerTermsSelectorsIDs.BACK_BUTTON));

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  describe('analytics', () => {
    const identityTermsStatuses = () =>
      jest
        .mocked(trackVbaEvent)
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
      fireEvent.press(getByTestId(VbaPartnerTermsSelectorsIDs.AGREE_BUTTON));

      expect(identityTermsStatuses()).toStrictEqual([
        'page2_viewed',
        'page2_accepted',
      ]);
      expect(
        jest.mocked(trackVbaEvent).mock.invocationCallOrder.at(-1),
      ).toBeLessThan(mockOnAgree.mock.invocationCallOrder[0]);
    });

    it('does not track acceptance when the consent is never given', () => {
      const { getByTestId } = renderScreen();

      fireEvent.press(getByTestId(VbaPartnerTermsSelectorsIDs.AGREE_BUTTON));

      expect(identityTermsStatuses()).toStrictEqual(['page2_viewed']);
    });
  });
});
