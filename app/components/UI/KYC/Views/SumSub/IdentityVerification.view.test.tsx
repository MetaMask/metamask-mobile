import '../../../../../../tests/component-view/mocks';
import { act, waitFor } from '@testing-library/react-native';
import {
  KycController,
  type KycControllerMessenger,
  type KycControllerState,
  type KycDisclaimersCatalog,
  type KycSessionDisclaimers,
  type KycSessionStatus,
  type KycSumSubLaunchParams,
  type KycSumSubLauncher,
  type KycSumSubSdkStatus,
} from '@metamask/kyc-controller';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  renderVbaIdentityVerification,
  restoreVbaReduxServiceStore,
} from '../../../../../../tests/component-view/renderers/vba';
import Engine from '../../../../../core/Engine';
import { getKycControllerMessenger } from '../../../../../core/Engine/messengers/kyc/kyc-controller-messenger';
import {
  EMPTY_VBA_ONBOARDING_SNAPSHOT,
  type VbaOnboardingSnapshot,
} from '../../../Ramp/Views/VirtualBankAccount/vbaOnboardingSnapshot';
import { KycPendingSelectorsIDs } from '../Status/KycPending';
import { KycSumSubSelectorsIDs } from './SumSubKyc';

const SYNTHETIC_EMAIL = 'synthetic.user@example.com';
const SYNTHETIC_SESSION_ID = 'synthetic-session-1';
const SYNTHETIC_APPLICANT_TOKEN = 'synthetic-applicant-token';
const SYNTHETIC_PARTNER_IDENTITY_TOKEN =
  'e30.eyJleHQiOnsiZW1haWwiOiJzeW50aGV0aWMudXNlckBleGFtcGxlLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlfX0.c3ludGhldGlj';

const PROFILE_DETAILS_PENDING_STATUS = 'Pending' satisfies KycSumSubSdkStatus;
const CLOSED_WITHOUT_SUBMITTING_STATUS =
  'Incomplete' satisfies KycSumSubSdkStatus;

// A submitted close resumes the session, hydrates, and resets the stack.
const ROUTING_TIMEOUT_MS = 5000;

const syntheticSession: KycSessionStatus = {
  id: SYNTHETIC_SESSION_ID,
  externalUserId: 'synthetic-user-1',
  vendor: 'iron',
  vendorStatus: 'new',
  finalStatus: 'new',
  kycStatus: 'new',
  currentStep: 'kyc',
  consentStatus: 'given',
  capabilityAuthorizationStatus: 'stored',
};

const sessionDisclaimers: KycSessionDisclaimers = {
  idOS: [
    {
      key: 'synthetic-idos-notice',
      version: '1',
      title: 'Synthetic idOS notice',
      url: 'https://example.com/idos-notice',
      consented: false,
    },
  ],
  kycProvider: [
    {
      key: 'synthetic-sumsub-notice',
      version: '1',
      title: 'Synthetic SumSub notice',
      url: 'https://example.com/sumsub-notice',
      consented: false,
    },
  ],
  credentialReusabilityConsentGiven: false,
};

const countryDisclaimers: KycDisclaimersCatalog = {
  idOS: sessionDisclaimers.idOS.map(({ key, version, title, url }) => ({
    key,
    version,
    title,
    url,
  })),
  kycProvider: sessionDisclaimers.kycProvider.map(
    ({ key, version, title, url }) => ({
      key,
      version,
      title,
      url,
    }),
  ),
};

const identityVerificationSnapshot: VbaOnboardingSnapshot = {
  ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
  sessionExists: true,
  vendorDisclaimersComplete: true,
  vendorTermsAcceptedLocally: true,
  sessionDisclaimersComplete: true,
  providerFlowStatus: 'not_started',
  kycStatus: 'new',
};

const submittedPendingHydrate = {
  sessionExists: true,
  vendorDisclaimersComplete: true,
  sessionDisclaimersComplete: true,
  providerFlowStatus: 'submitted',
  kycStatus: 'pending',
  autorampStatus: 'not_ready',
} as const;

const pendingCloses: (() => void)[] = [];

const sumsubLauncher: KycSumSubLauncher = {
  isAvailable: (): boolean => true,
  launch: (params: KycSumSubLaunchParams): Promise<Record<string, unknown>> =>
    new Promise((resolve) => {
      params.onStatusChange?.('Initial', PROFILE_DETAILS_PENDING_STATUS);
      pendingCloses.push(() => {
        params.onStatusChange?.(
          PROFILE_DETAILS_PENDING_STATUS,
          CLOSED_WITHOUT_SUBMITTING_STATUS,
        );
        resolve({
          success: false,
          status: CLOSED_WITHOUT_SUBMITTING_STATUS,
        });
      });
    }),
};

const closeOpenSumSubSessions = (): void => {
  pendingCloses.splice(0).forEach((close) => {
    close();
  });
};

const createKycController = (): KycController => {
  const rootMessenger = new Messenger<
    MockAnyNamespace,
    MessengerActions<KycControllerMessenger>,
    MessengerEvents<KycControllerMessenger>
  >({ namespace: MOCK_ANY_NAMESPACE });
  rootMessenger.registerActionHandler(
    'KycService:fetchSessionDisclaimersByCountry',
    async () => countryDisclaimers,
  );
  rootMessenger.registerActionHandler(
    'KycService:fetchSessionDisclaimersBySessionId',
    async () => sessionDisclaimers,
  );
  rootMessenger.registerActionHandler(
    'KycService:submitSessionDisclaimers',
    async () => sessionDisclaimers,
  );
  rootMessenger.registerActionHandler('KycService:createJourney', async () => ({
    status: 'created',
    applicantAccessToken: SYNTHETIC_APPLICANT_TOKEN,
  }));
  rootMessenger.registerActionHandler(
    'KycService:getSessionStatus',
    async () => syntheticSession,
  );
  rootMessenger.registerActionHandler(
    'KycService:getGeoCountry',
    async () => 'BRA',
  );
  rootMessenger.registerActionHandler(
    'AuthenticatedUserStorageService:putIdentitySharingConsent',
    async () => undefined,
  );
  rootMessenger.registerActionHandler(
    'AuthenticationController:getPartnerIdentityToken',
    async () => SYNTHETIC_PARTNER_IDENTITY_TOKEN,
  );

  const controllerState: Partial<KycControllerState> = {
    email: SYNTHETIC_EMAIL,
    vendor: 'iron',
    geoCountry: 'BRA',
    sessionStatus: syntheticSession,
    providerFlowStatus: 'not_started',
  };

  return new KycController({
    messenger: getKycControllerMessenger(
      rootMessenger as unknown as Parameters<
        typeof getKycControllerMessenger
      >[0],
    ),
    state: controllerState,
    sumsubLauncher,
  });
};

describeForPlatforms('Identity verification', () => {
  jest.setTimeout(60000);

  let kycController: KycController;
  let previousKycController: (typeof Engine.context)['KycController'];
  const hydrateVbaOnboarding = jest.mocked(
    Engine.context.RampsController.hydrateVbaOnboarding,
  );
  let previousHydrate: ReturnType<
    typeof hydrateVbaOnboarding.getMockImplementation
  >;

  beforeEach(() => {
    pendingCloses.length = 0;
    previousKycController = Engine.context.KycController;
    previousHydrate = hydrateVbaOnboarding.getMockImplementation();
    hydrateVbaOnboarding.mockResolvedValue(submittedPendingHydrate);
    kycController = createKycController();
    Engine.context.KycController = kycController;
  });

  afterEach(() => {
    kycController.clearState();
    Engine.context.KycController = previousKycController;
    hydrateVbaOnboarding.mockReset();
    if (previousHydrate) {
      hydrateVbaOnboarding.mockImplementation(previousHydrate);
    }
    restoreVbaReduxServiceStore();
    pendingCloses.length = 0;
  });

  it('stays on identity verification when SumSub reports Pending on Profile details and the user closes it', async () => {
    const { getByTestId, queryByTestId } = renderVbaIdentityVerification({
      snapshot: identityVerificationSnapshot,
    });

    await waitFor(() => {
      expect(pendingCloses.length).toBeGreaterThan(0);
    });

    await act(async () => {
      closeOpenSumSubSessions();
    });

    await waitFor(
      () => {
        const flowStatus = kycController.state.providerFlowStatus;
        if (flowStatus === 'submitted') {
          expect(
            getByTestId(KycPendingSelectorsIDs.CONTAINER),
          ).toBeOnTheScreen();
          return;
        }
        expect(flowStatus).toBe('abandoned');
      },
      { timeout: ROUTING_TIMEOUT_MS },
    );

    expect(
      queryByTestId(KycPendingSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(getByTestId(KycSumSubSelectorsIDs.CONTAINER)).toBeOnTheScreen();
  });
});
