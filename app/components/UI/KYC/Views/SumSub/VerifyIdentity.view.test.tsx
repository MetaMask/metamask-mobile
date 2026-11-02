import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { Linking } from 'react-native';
import type { KycController } from '@metamask/kyc-controller';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import ReduxService, { type ReduxStore } from '../../../../../core/redux';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { initialStateVba } from '../../../../../../tests/component-view/presets/vba';
import { strings } from '../../../../../../locales/i18n';
import {
  METAMASK_PRIVACY_POLICY_URL,
  METAMASK_TERMS_URL,
  SUMSUB_BIOMETRICS_CONSENT_URL,
  SUMSUB_PERSONAL_DATA_PROCESSING_URL,
  SUMSUB_PRIVACY_NOTICE_URL,
} from '../../../Ramp/Views/VirtualBankAccount/constants';
import VbaVerifyIdentity from './VerifyIdentity';
import { VbaVerifyIdentitySelectorsIDs } from './VerifyIdentity.testIds';

const IDOS_TERMS_URL = 'https://www.idos.network/legal/user-agreement';
const IDOS_PRIVACY_POLICY_URL = 'https://www.idos.network/legal/privacy-policy';
const IDOS_TRANSPARENCY_URL =
  'https://www.idos.network/legal/transparency-document';

const sessionCatalog = {
  idOS: [
    {
      key: 'end_user_agreement',
      version: '1',
      title: 'End User Agreement',
      url: IDOS_TERMS_URL,
    },
    {
      key: 'privacy_policy',
      version: '1',
      title: 'Privacy Policy',
      url: IDOS_PRIVACY_POLICY_URL,
    },
    {
      key: 'privacy_notice',
      version: '1',
      title: 'Privacy Notice',
      url: 'https://www.idos.network/legal/privacy-notice',
    },
    {
      key: 'transparency_document',
      version: '1',
      title: 'Transparency Document',
      url: IDOS_TRANSPARENCY_URL,
    },
  ],
  kycProvider: [
    {
      key: 'notice_of_personal_data_processing',
      version: '1',
      title: 'Notice of Personal Data Processing',
      url: SUMSUB_PERSONAL_DATA_PROCESSING_URL,
    },
  ],
};

const mockFetchSessionDisclaimers = jest.fn<
  ReturnType<KycController['fetchSessionDisclaimers']>,
  Parameters<KycController['fetchSessionDisclaimers']>
>();
Object.assign(Engine.context.KycController, {
  fetchSessionDisclaimers: mockFetchSessionDisclaimers,
});

const verifyIdentityKey = (key: string) =>
  strings(`virtual_bank_account.verify_identity.${key}`);

const renderVerifyIdentity = () =>
  renderWithProvider(<VbaVerifyIdentity onSuccess={jest.fn()} />, {
    state: initialStateVba().build(),
  });

const openDataAndPrivacySheet = async () => {
  const result = renderVerifyIdentity();
  await waitFor(() =>
    expect(
      result.getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
    ).toBeEnabled(),
  );
  fireEvent.press(
    result.getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
  );
  return result;
};

describeForPlatforms('VbaVerifyIdentity view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchSessionDisclaimers.mockResolvedValue(
      sessionCatalog as Awaited<
        ReturnType<KycController['fetchSessionDisclaimers']>
      >,
    );
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

  it('keeps the MetaMask links in the footer and the Agree & Continue CTA', async () => {
    const { getByTestId } = renderVerifyIdentity();

    await waitFor(() =>
      expect(
        getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
      ).toHaveTextContent(verifyIdentityKey('agree_and_continue_button')),
    );
    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.METAMASK_TERMS_LINK),
    );
    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.METAMASK_PRIVACY_POLICY_LINK),
    );

    expect(jest.mocked(Linking.openURL).mock.calls).toEqual([
      [METAMASK_TERMS_URL],
      [METAMASK_PRIVACY_POLICY_URL],
    ]);
  });

  it('lists the three idOS documents from the session catalog', async () => {
    const { getByTestId, getByText, queryByTestId } =
      await openDataAndPrivacySheet();

    expect(
      getByText(
        `${verifyIdentityKey('terms_link_idos_terms_prefix')}${verifyIdentityKey(
          'terms_link_idos_terms',
        )}`,
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(verifyIdentityKey('terms_link_idos_privacy_policy')),
    ).toBeOnTheScreen();
    expect(
      getByText(verifyIdentityKey('terms_link_idos_transparency')),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(
        `${VbaVerifyIdentitySelectorsIDs.DISCLAIMER_LINK}-idOS:privacy_notice`,
      ),
    ).not.toBeOnTheScreen();

    ['end_user_agreement', 'privacy_policy', 'transparency_document'].forEach(
      (key) =>
        fireEvent.press(
          getByTestId(
            `${VbaVerifyIdentitySelectorsIDs.DISCLAIMER_LINK}-idOS:${key}`,
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
    const { getByTestId } = await openDataAndPrivacySheet();

    [
      VbaVerifyIdentitySelectorsIDs.SUMSUB_PERSONAL_DATA_PROCESSING_LINK,
      VbaVerifyIdentitySelectorsIDs.SUMSUB_PRIVACY_NOTICE_LINK,
      VbaVerifyIdentitySelectorsIDs.SUMSUB_BIOMETRICS_CONSENT_LINK,
    ].forEach((testID) => fireEvent.press(getByTestId(testID)));

    expect(jest.mocked(Linking.openURL).mock.calls).toEqual([
      [SUMSUB_PERSONAL_DATA_PROCESSING_URL],
      [SUMSUB_PRIVACY_NOTICE_URL],
      [SUMSUB_BIOMETRICS_CONSENT_URL],
    ]);
  });

  it('keeps Agree disabled until the biometric consent is ticked', async () => {
    const { getByTestId, getAllByRole } = await openDataAndPrivacySheet();

    expect(getAllByRole('checkbox')).toHaveLength(1);
    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.AGREE_BUTTON),
    ).toBeDisabled();

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX),
    );

    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.AGREE_BUTTON),
    ).toBeEnabled();
  });
});
