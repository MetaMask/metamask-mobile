import '../../../../../tests/component-view/mocks';
import { act, fireEvent } from '@testing-library/react-native';
import type { VerificationToken } from '@metamask/profile-sync-controller/sdk';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import {
  renderVbaEmailSessionCreation,
  restoreVbaReduxServiceStore,
} from '../../../../../tests/component-view/renderers/vba';
import { getActiveMfaFlow } from '../../../../util/identity/mfa/engine/activeFlow';
import { MfaFlowSelectorsIDs } from '../../../Views/Mfa/Mfa.testIds';
import { VbaVerifyIdentitySelectorsIDs } from './SumSub/VerifyIdentity.testIds';

const EMAIL = 'ada@example.com';
const CODE = '123456';
const AAL2_TOKEN = 'email_otp-token';

const emailChallenge = {
  type: 'email_otp' as const,
  flowId: 'enroll-1',
  expiresAt: Date.now() + 60_000,
};

const enrolledEmail = {
  id: 'email_otp',
  type: 'email_otp' as const,
  status: 'active' as const,
  email: EMAIL,
  verified: true,
};

// `VerificationToken` (`authentication-jwt-bearer/mfa/types.d.ts`).
const verificationToken = (): VerificationToken => ({
  accessToken: AAL2_TOKEN,
  expiresIn: 900,
  obtainedAt: Date.now(),
  claims: {
    sub: 'profile',
    amr: ['email_otp'],
    exp: Date.now() / 1000 + 900,
  },
});

// `KycCatalogDocument` (`kyc-controller` `types.d.ts`).
const disclaimerCatalog = {
  idOS: [
    {
      key: 'idos-privacy',
      version: '1',
      title: 'idOS Privacy',
      url: 'https://idos.example/privacy',
    },
  ],
  kycProvider: [
    {
      key: 'sumsub-terms',
      version: '1',
      title: 'Sumsub Terms',
      url: 'https://sumsub.example/terms',
    },
  ],
  credentialReusabilityConsentGiven: false,
};

const auth = Engine.context.AuthenticationController as unknown as {
  refreshEnrolledCredentials: jest.Mock;
  beginCredentialEnrollment: jest.Mock;
  completeCredentialEnrollment: jest.Mock;
  getVerificationToken: jest.Mock;
  clearVerificationSession: jest.Mock;
};

const kyc = Engine.context.KycController as unknown as {
  getSessionStatusForVendor: jest.Mock;
  startSession: jest.Mock;
  fetchSessionDisclaimers: jest.Mock;
};

const hydrate = jest.mocked(
  Engine.context.RampsController.hydrateVbaOnboarding,
);

describeForPlatforms('VBA first session creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    let session: VerificationToken | null = null;
    kyc.getSessionStatusForVendor = jest.fn().mockResolvedValue(null);
    kyc.startSession = jest.fn().mockResolvedValue(undefined);
    kyc.fetchSessionDisclaimers = jest
      .fn()
      .mockResolvedValue(disclaimerCatalog);
    hydrate.mockResolvedValue({
      sessionExists: true,
      vendorDisclaimersComplete: true,
      sessionDisclaimersComplete: false,
      providerFlowStatus: 'not_started',
      kycStatus: 'new',
      autorampStatus: 'not_ready',
    });
    auth.refreshEnrolledCredentials = jest.fn().mockResolvedValue([]);
    auth.beginCredentialEnrollment = jest
      .fn()
      .mockResolvedValue(emailChallenge);
    auth.completeCredentialEnrollment = jest.fn(async () => {
      session = verificationToken();
      return [enrolledEmail];
    });
    auth.getVerificationToken = jest.fn(async () => session);
    auth.clearVerificationSession = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    const flow = getActiveMfaFlow();
    if (flow) {
      await act(async () => {
        flow.dispatch({ type: 'cancel' });
      });
    }
    restoreVbaReduxServiceStore();
  });

  it('creates the KYC session with the email code token and opens identity verification', async () => {
    const { findByTestId, getByTestId, getByText } =
      renderVbaEmailSessionCreation();

    fireEvent.press(await findByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON));
    fireEvent.changeText(
      await findByTestId(MfaFlowSelectorsIDs.EMAIL_INPUT),
      EMAIL,
    );
    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON));
    await act(async () => {
      fireEvent.changeText(
        await findByTestId(MfaFlowSelectorsIDs.CODE_INPUT),
        CODE,
      );
    });

    expect(
      await findByTestId(VbaVerifyIdentitySelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.verify_identity.title')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
    ).toBeEnabled();
    expect(kyc.startSession).toHaveBeenCalledWith({
      vendor: 'iron',
      aal2Token: AAL2_TOKEN,
    });
    expect(kyc.getSessionStatusForVendor).toHaveBeenCalledWith('iron');
  });
});
