import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { IDOS_PRIVACY_NOTICE_URL } from '../../../Ramp/Views/VirtualBankAccount/constants';
import VbaProviderTermsSheet from './ProviderTermsSheet';
import { VbaVerifyIdentitySelectorsIDs } from './VerifyIdentity.testIds';
import {
  KycConsentVendor,
  SOCURE_BIOMETRIC_PROCESSING_AGREEMENT_URL,
  SOCURE_PRIVACY_NOTICE_URL,
  SOCURE_TERMS_OF_USE_URL,
} from './kycConsentVendor';
import type { KycCatalogDisclaimerLink } from '../../hooks/useKycSessionDisclaimers';

jest.mock('../../../../../hooks/useScreenPerformance');

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const MockBottomSheet = ReactActual.forwardRef(
    (
      {
        children,
        testID,
      }: {
        children: React.ReactNode;
        testID?: string;
      },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: (callback?: () => void) => {
          callback?.();
        },
        onOpenBottomSheet: jest.fn(),
      }));
      return ReactActual.createElement(View, { testID }, children);
    },
  );

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
  };
});

const legalCatalog: KycCatalogDisclaimerLink[] = [
  {
    id: 'idOS:privacy_policy',
    key: 'privacy_policy',
    version: '1',
    title: 'idOS Privacy Policy',
    url: 'https://idos.example/privacy-policy',
  },
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

const documentRowTestId =
  /^vba-verify-identity-(disclaimer-link-.+|socure-terms-row)$/;

const renderSheet = (vendor: KycConsentVendor = KycConsentVendor.Vba) =>
  renderWithProvider(
    <VbaProviderTermsSheet
      disclaimers={legalCatalog}
      onAgree={jest.fn()}
      onClose={jest.fn()}
      vendor={vendor}
    />,
  );

describe('VbaProviderTermsSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the four VBA documents and only the idOS biometric consent', () => {
    const { getAllByTestId, getByTestId, queryByTestId } = renderSheet();

    expect(
      getAllByTestId(documentRowTestId).map((row) => row.props.testID),
    ).toEqual([
      `${VbaVerifyIdentitySelectorsIDs.DISCLAIMER_LINK}-idOS:end_user_agreement`,
      `${VbaVerifyIdentitySelectorsIDs.DISCLAIMER_LINK}-idOS:privacy_notice`,
      `${VbaVerifyIdentitySelectorsIDs.DISCLAIMER_LINK}-idOS:transparency_document`,
      `${VbaVerifyIdentitySelectorsIDs.DISCLAIMER_LINK}-kycProvider:notice_of_personal_data_processing`,
    ]);
    expect(
      queryByTestId(VbaVerifyIdentitySelectorsIDs.SOCURE_TERMS_ROW),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(VbaVerifyIdentitySelectorsIDs.BPA_CONSENT_CHECKBOX),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.AGREE_BUTTON),
    ).toBeDisabled();
  });

  it('enables Agree for VBA when only the idOS biometric consent is ticked', () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX),
    );

    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.AGREE_BUTTON),
    ).toBeEnabled();
  });

  it('opens the idOS Privacy Notice from the VBA biometric consent', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId } = renderSheet();

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.BIOMETRIC_CONSENT_LINK),
    );

    expect(openUrlSpy).toHaveBeenCalledWith(IDOS_PRIVACY_NOTICE_URL);
  });

  describe('Kalshi vendor', () => {
    const renderKalshiSheet = () => renderSheet(KycConsentVendor.Kalshi);

    it('adds the Socure terms row as the fifth document', () => {
      const { getAllByTestId, getByTestId } = renderKalshiSheet();

      expect(
        getAllByTestId(documentRowTestId).map((row) => row.props.testID),
      ).toEqual([
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

    it('opens both Socure URLs from the fifth row', () => {
      const openUrlSpy = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue(undefined);
      const { getByTestId } = renderKalshiSheet();

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

    it('keeps Agree disabled until the idOS and BPA consents are both ticked', () => {
      const { getByTestId } = renderKalshiSheet();

      expect(
        getByTestId(VbaVerifyIdentitySelectorsIDs.AGREE_BUTTON),
      ).toBeDisabled();

      fireEvent.press(
        getByTestId(VbaVerifyIdentitySelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX),
      );
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
        getByTestId(VbaVerifyIdentitySelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX),
      );
      expect(
        getByTestId(VbaVerifyIdentitySelectorsIDs.AGREE_BUTTON),
      ).toBeDisabled();
    });

    it('opens the Biometric Processing Agreement placeholder without ticking BPA consent', () => {
      const openUrlSpy = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue(undefined);
      const { getByTestId } = renderKalshiSheet();

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
      expect(
        getByTestId(VbaVerifyIdentitySelectorsIDs.AGREE_BUTTON),
      ).toBeDisabled();
    });
  });
});
