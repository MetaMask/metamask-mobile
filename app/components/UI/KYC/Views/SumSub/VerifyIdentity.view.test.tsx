import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { Linking } from 'react-native';
import type { KycController } from '@metamask/kyc-controller';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import ReduxService, { type ReduxStore } from '../../../../../core/redux';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { initialStateVba } from '../../../../../../tests/component-view/presets/vba';
import { strings } from '../../../../../../locales/i18n';
import {
  METAMASK_PRIVACY_NOTICE_URL,
  METAMASK_TERMS_URL,
  SUMSUB_BIOMETRICS_CONSENT_URL,
  SUMSUB_PERSONAL_DATA_PROCESSING_URL,
  SUMSUB_PRIVACY_NOTICE_URL,
} from '../../../Ramp/Views/VirtualBankAccount/constants';
import { EMPTY_VBA_ONBOARDING_SNAPSHOT } from '../../../Ramp/Views/VirtualBankAccount/vbaOnboardingSnapshot';
import VbaIdentityVerificationModule from './IdentityVerification';
import {
  VbaVerificationPartnersSelectorsIDs,
  VbaVerifyIdentitySelectorsIDs,
} from './VerifyIdentity.testIds';

const IDOS_TERMS_URL = 'https://www.idos.network/legal/user-agreement';
const IDOS_PRIVACY_POLICY_URL = 'https://www.idos.network/legal/privacy-policy';
const IDOS_TRANSPARENCY_URL =
  'https://www.idos.network/legal/transparency-document';

const toCatalogDocument = ([key, url]: [string, string]) => ({
  key,
  url,
  version: '1',
  title: key,
});

const sessionCatalog = {
  idOS: (
    [
      ['end_user_agreement', IDOS_TERMS_URL],
      ['privacy_policy', IDOS_PRIVACY_POLICY_URL],
      ['privacy_notice', 'https://www.idos.network/legal/privacy-notice'],
      ['transparency_document', IDOS_TRANSPARENCY_URL],
    ] as [string, string][]
  ).map(toCatalogDocument),
  kycProvider: [
    toCatalogDocument([
      'notice_of_personal_data_processing',
      SUMSUB_PERSONAL_DATA_PROCESSING_URL,
    ]),
  ],
};

const mockFetchSessionDisclaimers = jest.fn<
  ReturnType<KycController['fetchSessionDisclaimers']>,
  Parameters<KycController['fetchSessionDisclaimers']>
>();
const mockRecordSessionDisclaimers = jest.fn();
const mockLaunchProviderFlow = jest.fn();
Object.assign(Engine.context.KycController, {
  fetchSessionDisclaimers: mockFetchSessionDisclaimers,
  recordSessionDisclaimers: mockRecordSessionDisclaimers,
  launchProviderFlow: mockLaunchProviderFlow,
});

const verifyIdentityKey = (key: string) =>
  strings(`virtual_bank_account.verify_identity.${key}`);

type ModuleProps = React.ComponentProps<typeof VbaIdentityVerificationModule>;

const newSessionRoute = {
  key: 'VbaIdentityVerificationKey',
  params: { snapshot: EMPTY_VBA_ONBOARDING_SNAPSHOT },
} as ModuleProps['route'];

const renderFlow = () =>
  renderWithProvider(
    <VbaIdentityVerificationModule
      route={newSessionRoute}
      navigation={{} as ModuleProps['navigation']}
    />,
    { state: initialStateVba().build() },
  );

type Rendered = ReturnType<typeof renderFlow>;

const openVerificationPartners = async () => {
  const result = renderFlow();
  fireEvent.press(
    result.getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
  );
  await waitFor(() =>
    expect(
      result.getByTestId(VbaVerificationPartnersSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen(),
  );
  // Agree waits on the session terms as well as the consent tick.
  await waitFor(() =>
    expect(
      result.getByTestId(
        `${VbaVerificationPartnersSelectorsIDs.DISCLAIMER_LINK}-idOS:end_user_agreement`,
      ),
    ).toBeOnTheScreen(),
  );
  return result;
};

const tickBiometricConsent = ({ getByTestId }: Rendered) =>
  fireEvent.press(
    getByTestId(VbaVerificationPartnersSelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX),
  );

// Lays out a 600pt viewport with the consent row on screen, so the footer CTA
// switches from Scroll to continue to Agree to consent above.
const revealConsent = ({ getByTestId }: Rendered) => {
  fireEvent(
    getByTestId(VbaVerificationPartnersSelectorsIDs.CONTAINER),
    'layout',
    { nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 600 } } },
  );
  fireEvent(
    getByTestId(VbaVerificationPartnersSelectorsIDs.BIOMETRIC_CONSENT_ROW),
    'layout',
    { nativeEvent: { layout: { x: 16, y: 300, width: 368, height: 140 } } },
  );
};

describeForPlatforms('VbaVerifyIdentity view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchSessionDisclaimers.mockResolvedValue(
      sessionCatalog as Awaited<
        ReturnType<KycController['fetchSessionDisclaimers']>
      >,
    );
    mockRecordSessionDisclaimers.mockResolvedValue(undefined);
    // Never resolves: the assertions are on the launch happening at all.
    mockLaunchProviderFlow.mockReturnValue(new Promise(() => undefined));
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    // Analytics base properties read the region from ReduxService.
    const state = initialStateVba().build();
    jest
      .spyOn(ReduxService, 'store', 'get')
      .mockReturnValue({ getState: () => state } as unknown as ReduxStore);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('screen 1 of 2: Verify your identity', () => {
    it('shows the MetaMask consent line and opens its links', () => {
      const { getByTestId } = renderFlow();

      expect(
        getByTestId(VbaVerifyIdentitySelectorsIDs.STEP_COUNTER),
      ).toHaveTextContent('Step 1 of 2', { exact: true });
      expect(
        getByTestId(VbaVerifyIdentitySelectorsIDs.METAMASK_AGREEMENT),
      ).toHaveTextContent(
        'By tapping Agree and continue, I agree to the MetaMask Terms of Use, acknowledge the MetaMask Privacy Notice and consent to MetaMask transferring my information to idOS.',
        { exact: true },
      );
      fireEvent.press(
        getByTestId(VbaVerifyIdentitySelectorsIDs.METAMASK_TERMS_LINK),
      );
      fireEvent.press(
        getByTestId(VbaVerifyIdentitySelectorsIDs.METAMASK_PRIVACY_NOTICE_LINK),
      );

      expect(jest.mocked(Linking.openURL).mock.calls).toEqual([
        [METAMASK_TERMS_URL],
        [METAMASK_PRIVACY_NOTICE_URL],
      ]);
    });

    it('opens screen 2 with Agree and continue, which is always enabled', async () => {
      const { getByTestId } = renderFlow();
      const continueButton = getByTestId(
        VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON,
      );

      expect(continueButton).toBeEnabled();
      expect(continueButton).toHaveTextContent(
        verifyIdentityKey('agree_and_continue_button'),
      );
      fireEvent.press(continueButton);

      await waitFor(() =>
        expect(
          getByTestId(VbaVerificationPartnersSelectorsIDs.STEP_COUNTER),
        ).toHaveTextContent('Step 2 of 2', { exact: true }),
      );
      expect(mockLaunchProviderFlow).not.toHaveBeenCalled();
    });
  });

  describe('screen 2 of 2: Our verification partners', () => {
    it('lists the three idOS documents from the session catalog', async () => {
      const { getByTestId, queryByTestId } = await openVerificationPartners();

      expect(
        queryByTestId(
          `${VbaVerificationPartnersSelectorsIDs.DISCLAIMER_LINK}-idOS:privacy_notice`,
        ),
      ).not.toBeOnTheScreen();
      ['end_user_agreement', 'privacy_policy', 'transparency_document'].forEach(
        (key) =>
          fireEvent.press(
            getByTestId(
              `${VbaVerificationPartnersSelectorsIDs.DISCLAIMER_LINK}-idOS:${key}`,
            ),
          ),
      );

      expect(jest.mocked(Linking.openURL).mock.calls).toEqual([
        [IDOS_TERMS_URL],
        [IDOS_PRIVACY_POLICY_URL],
        [IDOS_TRANSPARENCY_URL],
      ]);
    });

    it('shows the Sumsub acknowledgement as text with three links', async () => {
      const { getByTestId } = await openVerificationPartners();

      [
        VbaVerificationPartnersSelectorsIDs.SUMSUB_PERSONAL_DATA_PROCESSING_LINK,
        VbaVerificationPartnersSelectorsIDs.SUMSUB_PRIVACY_NOTICE_LINK,
        VbaVerificationPartnersSelectorsIDs.SUMSUB_BIOMETRICS_CONSENT_LINK,
      ].forEach((testID) => fireEvent.press(getByTestId(testID)));

      expect(jest.mocked(Linking.openURL).mock.calls).toEqual([
        [SUMSUB_PERSONAL_DATA_PROCESSING_URL],
        [SUMSUB_PRIVACY_NOTICE_URL],
        [SUMSUB_BIOMETRICS_CONSENT_URL],
      ]);
    });

    it('shows the idOS consent line with the idOS Terms and Conditions link', async () => {
      const { getByTestId } = await openVerificationPartners();

      expect(
        getByTestId(VbaVerificationPartnersSelectorsIDs.IDOS_AGREEMENT),
      ).toHaveTextContent(
        'By tapping Agree and continue, I agree to idOS Terms and Conditions.',
        { exact: true },
      );
      fireEvent.press(
        getByTestId(VbaVerificationPartnersSelectorsIDs.IDOS_TERMS_LINK),
      );
      expect(jest.mocked(Linking.openURL)).toHaveBeenCalledWith(IDOS_TERMS_URL);
    });

    it('keeps Agree disabled until the biometric consent is ticked', async () => {
      const result = await openVerificationPartners();
      const { getByRole, getByTestId, getAllByRole } = result;
      const checkbox = getByTestId(
        VbaVerificationPartnersSelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX,
      );
      expect(checkbox.props.accessibilityLabel).toBe(
        `${verifyIdentityKey('biometric_consent_label')}${verifyIdentityKey(
          'biometric_consent_link',
        )}${verifyIdentityKey('biometric_consent_label_end')}`,
      );
      expect(within(checkbox).queryByRole('link')).not.toBeOnTheScreen();
      fireEvent.press(getByRole('link', { name: /idOS Privacy Notice/ }));
      expect(jest.mocked(Linking.openURL)).toHaveBeenCalledWith(
        'https://www.idos.network/legal/privacy-notice',
      );

      expect(getAllByRole('checkbox')).toHaveLength(1);
      expect(
        getByTestId(VbaVerificationPartnersSelectorsIDs.AGREE_BUTTON),
      ).toHaveTextContent('Scroll to continue', { exact: true });
      expect(
        getByTestId(VbaVerificationPartnersSelectorsIDs.AGREE_BUTTON),
      ).toBeDisabled();
      revealConsent(result);
      expect(
        getByTestId(VbaVerificationPartnersSelectorsIDs.AGREE_BUTTON),
      ).toHaveTextContent('Agree to consent above', { exact: true });
      expect(
        getByTestId(VbaVerificationPartnersSelectorsIDs.AGREE_BUTTON),
      ).toBeDisabled();

      tickBiometricConsent(result);

      expect(
        getByTestId(VbaVerificationPartnersSelectorsIDs.AGREE_BUTTON),
      ).toHaveTextContent('Agree and continue', { exact: true });
      expect(
        getByTestId(VbaVerificationPartnersSelectorsIDs.AGREE_BUTTON),
      ).toBeEnabled();
    });

    it('keeps the tick when going back to screen 1 and forward again', async () => {
      const result = await openVerificationPartners();
      tickBiometricConsent(result);

      fireEvent.press(
        result.getByTestId(VbaVerificationPartnersSelectorsIDs.BACK_BUTTON),
      );
      await waitFor(() =>
        expect(
          result.getByTestId(VbaVerifyIdentitySelectorsIDs.CONTAINER),
        ).toBeOnTheScreen(),
      );
      fireEvent.press(
        result.getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
      );

      await waitFor(() =>
        expect(
          result.getByTestId(
            VbaVerificationPartnersSelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX,
          ),
        ).toBeChecked(),
      );
      expect(
        result.getByTestId(VbaVerificationPartnersSelectorsIDs.AGREE_BUTTON),
      ).toBeEnabled();
    });

    it('starts Sumsub only after the consent is ticked and Agree is pressed', async () => {
      const result = await openVerificationPartners();
      const agree = () =>
        result.getByTestId(VbaVerificationPartnersSelectorsIDs.AGREE_BUTTON);
      revealConsent(result);

      fireEvent.press(agree());
      expect(mockRecordSessionDisclaimers).not.toHaveBeenCalled();
      expect(mockLaunchProviderFlow).not.toHaveBeenCalled();

      tickBiometricConsent(result);
      fireEvent.press(agree());

      await waitFor(() =>
        expect(mockLaunchProviderFlow).toHaveBeenCalledTimes(1),
      );
      expect(
        result.queryByTestId(VbaVerificationPartnersSelectorsIDs.CONTAINER),
      ).not.toBeOnTheScreen();
      expect(
        result.queryByTestId(VbaVerifyIdentitySelectorsIDs.CONTAINER),
      ).not.toBeOnTheScreen();
    });
  });
});
