import '../../../../../../tests/component-view/mocks';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import { act, fireEvent } from '@testing-library/react-native';
import { HttpError } from '@metamask/controller-utils';
import type { KycSessionStatus } from '@metamask/kyc-controller';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { MONEY_MOVEMENT_NEOBANK_FLAG_KEY } from '../../../../../selectors/featureFlagController/moneyAccount';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { getRouteProbeTestId } from '../../../../../../tests/component-view/render';
import {
  renderVbaIdentityVerification,
  restoreVbaReduxServiceStore,
} from '../../../../../../tests/component-view/renderers/vba';
import {
  EMPTY_VBA_ONBOARDING_SNAPSHOT,
  type VbaOnboardingSnapshot,
} from '../../../Ramp/Views/VirtualBankAccount/vbaOnboardingSnapshot';
import { resetMusdAutorampSetupGuard } from '../../../Ramp/Views/VirtualBankAccount/ensureMusdAutoramp';
import { VbaKycPendingSelectorsIDs } from '../Status/KycPending';
import { VbaIdentityVerifiedSelectorsIDs } from '../Status/IdentityVerified';
import { VbaKycRejectedSelectorsIDs } from '../Status/KycRejected';
import { VbaSumSubKycSelectorsIDs } from './SumSubKyc';

// Hydrate, the funnel, and a stack reset run between each status and screen.
const FLOW_TIMEOUT_MS = 5000;

type HydratedSnapshot = Omit<VbaOnboardingSnapshot, 'vendorTermsAcceptedLocally'>;
type View = ReturnType<typeof renderVbaIdentityVerification>;

const engineWithState = Engine as unknown as {
  state?: Record<string, unknown>;
};
const engineContext = Engine.context as unknown as {
  KycController: Record<string, unknown>;
  RampsController: { hydrateVbaOnboarding: jest.Mock };
};
const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

// `GET /sessions/{id}/status` body (`SessionStatusResponseStruct`).
const sessionStatus = (
  finalStatus: string,
  kycStatus = finalStatus,
): KycSessionStatus => ({
  id: 'session-1',
  externalUserId: 'user-1',
  vendor: 'sumsub',
  vendorStatus:
    finalStatus === 'pending' || finalStatus === 'new'
      ? 'pending'
      : 'completed',
  finalStatus,
  kycStatus,
});

// What `RampsController.hydrateVbaOnboarding` returns once the provider flow
// was submitted and the session-level consents were recorded.
const hydrated = (
  kycStatus: HydratedSnapshot['kycStatus'],
  autorampStatus: HydratedSnapshot['autorampStatus'] = 'not_ready',
): HydratedSnapshot => ({
  sessionExists: true,
  vendorDisclaimersComplete: true,
  sessionDisclaimersComplete: true,
  providerFlowStatus: 'submitted',
  kycStatus,
  autorampStatus,
});

const ENTRY_SNAPSHOT: VbaOnboardingSnapshot = {
  ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
  vendorTermsAcceptedLocally: true,
  sessionExists: true,
  vendorDisclaimersComplete: true,
  sessionDisclaimersComplete: true,
  kycStatus: 'new',
};

const SESSION_DISCLAIMERS = {
  idOS: [],
  kycProvider: [],
  credentialReusabilityConsentGiven: false,
};

const usdRegionFlag = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
            enabled: true,
            minimumVersion: '0.0.0',
            regions: ['BR', 'US'],
            regionCurrencies: { BR: 'BRL', US: 'USD' },
          },
        },
      },
    },
  },
} as unknown as DeepPartial<RootState>;

const ACCOUNTS = [
  ['BRL', 'BR'],
  ['USD', 'US-CA'],
] as const;

let activeStore: View['store'] | undefined;

const readStoredSession = (): KycSessionStatus | null =>
  (
    activeStore?.getState().engine.backgroundState as unknown as {
      KycController?: { sessionStatus?: KycSessionStatus | null };
    }
  )?.KycController?.sessionStatus ?? null;

/** Writes a status the way the controller's poll does, then syncs Redux. */
const writeSessionStatus = (status: KycSessionStatus): void => {
  const backgroundState = activeStore?.getState().engine
    .backgroundState as unknown as Record<string, Record<string, unknown>>;
  engineWithState.state = {
    ...engineWithState.state,
    KycController: { ...backgroundState.KycController, sessionStatus: status },
  };
  activeStore?.dispatch(updateBgState({ key: 'KycController' }));
};

const pollReturns = (status: KycSessionStatus): void => {
  act(() => writeSessionStatus(status));
};

const kyc = () =>
  engineContext.KycController as Record<string, jest.Mock> & {
    state: { email: string };
  };

// The first hydrate after submit fetches the session status once, which
// writes the pending decision onto KycController state.
const hydratePending = async (): Promise<HydratedSnapshot> => {
  writeSessionStatus(sessionStatus('pending'));
  return hydrated('pending');
};

const renderSubmittedVerification = (
  location = 'BR',
  firstHydrate: () => Promise<HydratedSnapshot> = hydratePending,
): View => {
  engineContext.RampsController.hydrateVbaOnboarding.mockImplementation(
    firstHydrate,
  );
  const view = renderVbaIdentityVerification(ENTRY_SNAPSHOT, {
    location,
    overrides: location.startsWith('US') ? usdRegionFlag : undefined,
  });
  activeStore = view.store;
  act(() => writeSessionStatus(sessionStatus('new')));
  return view;
};

const findPending = (view: View) =>
  view.findByTestId(
    VbaKycPendingSelectorsIDs.CONTAINER,
    {},
    { timeout: FLOW_TIMEOUT_MS },
  );

describeForPlatforms('VBA identity verification responses', () => {
  let previousKycController: Record<string, unknown>;
  let previousHydrate: jest.Mock;

  beforeEach(() => {
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    resetMusdAutorampSetupGuard();
    previousKycController = engineContext.KycController;
    previousHydrate = engineContext.RampsController.hydrateVbaOnboarding;
    engineContext.RampsController.hydrateVbaOnboarding = jest.fn();
    engineContext.KycController = {
      state: { email: 'user@example.com' },
      readSessionStatus: jest.fn(readStoredSession),
      startSession: jest.fn().mockResolvedValue(undefined),
      refreshSessionStatus: jest.fn(),
      fetchSessionDisclaimers: jest.fn().mockResolvedValue(SESSION_DISCLAIMERS),
      recordSessionDisclaimers: jest
        .fn()
        .mockResolvedValue(SESSION_DISCLAIMERS),
      // Later launches stay on the SumSub spinner so a relaunch cannot loop.
      launchProviderFlow: jest
        .fn()
        .mockResolvedValueOnce('submitted')
        .mockReturnValue(new Promise(() => undefined)),
      fetchVendorDisclaimers: jest.fn().mockResolvedValue([]),
      recordVendorDisclaimers: jest.fn().mockResolvedValue([]),
    };
  });

  afterEach(() => {
    engineContext.KycController = previousKycController;
    engineContext.RampsController.hydrateVbaOnboarding = previousHydrate;
    engineWithState.state = undefined;
    activeStore = undefined;
    restoreVbaReduxServiceStore();
    netInfoMock.__resetMockNetInfo();
  });

  describe.each(ACCOUNTS)('%s account', (_currency, location) => {
    it('shows the pending screen and starts status polling once SumSub submits', async () => {
      const view = renderSubmittedVerification(location);

      expect(await findPending(view)).toBeOnTheScreen();
      expect(
        view.getByTestId(VbaKycPendingSelectorsIDs.ILLUSTRATION),
      ).toBeOnTheScreen();
      expect(
        view.getByText(strings('virtual_bank_account.kyc_taking_longer.title')),
      ).toBeOnTheScreen();
      expect(
        view.getByText(
          strings('virtual_bank_account.kyc_taking_longer.description'),
        ),
      ).toBeOnTheScreen();
      expect(kyc().refreshSessionStatus).toHaveBeenCalled();
    });

    it.each<[string, KycSessionStatus, HydratedSnapshot, string]>([
      [
        'approved with a usable autoramp',
        sessionStatus('approved'),
        hydrated('approved', 'ready'),
        getRouteProbeTestId(Routes.RAMP.VBA_DETAILS),
      ],
      [
        'approved before the wallet is registered',
        sessionStatus('approved'),
        hydrated('approved', 'needs_wallet_registration'),
        VbaIdentityVerifiedSelectorsIDs.CONTAINER,
      ],
      [
        'approved with a registered wallet and no autoramp',
        sessionStatus('approved'),
        hydrated('approved', 'needs_source_currency'),
        VbaIdentityVerifiedSelectorsIDs.CONTAINER,
      ],
      [
        'approved while the autoramp or customer lookup fails',
        sessionStatus('approved'),
        hydrated('approved', 'retryable_failure'),
        VbaIdentityVerifiedSelectorsIDs.CONTAINER,
      ],
      [
        'approved while the MoonPay customer is not Active',
        sessionStatus('approved'),
        hydrated('approved', 'not_ready'),
        VbaIdentityVerifiedSelectorsIDs.CONTAINER,
      ],
      [
        'relay-approved while finalStatus is still pending',
        sessionStatus('pending', 'approved'),
        hydrated('approved', 'needs_source_currency'),
        VbaIdentityVerifiedSelectorsIDs.CONTAINER,
      ],
      [
        'rejected',
        sessionStatus('rejected'),
        hydrated('rejected'),
        VbaKycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON,
      ],
      [
        'retry after the provider flow was submitted',
        sessionStatus('retry'),
        hydrated('retry'),
        VbaSumSubKycSelectorsIDs.CONTAINER,
      ],
    ])(
      'leaves pending when the status poll returns %s',
      async (_label, polledStatus, snapshot, expectedTestId) => {
        const view = renderSubmittedVerification(location);
        await findPending(view);
        engineContext.RampsController.hydrateVbaOnboarding.mockResolvedValue(
          snapshot,
        );

        pollReturns(polledStatus);

        expect(
          await view.findByTestId(
            expectedTestId,
            {},
            { timeout: FLOW_TIMEOUT_MS },
          ),
        ).toBeOnTheScreen();
        expect(
          view.queryByTestId(VbaKycPendingSelectorsIDs.CONTAINER),
        ).not.toBeOnTheScreen();
      },
    );
  });

  it('shows Try again on the rejected screen when the polled session asks for a retry before resubmitting', async () => {
    const view = renderSubmittedVerification();
    await findPending(view);
    engineContext.RampsController.hydrateVbaOnboarding.mockResolvedValue({
      ...hydrated('retry'),
      providerFlowStatus: 'abandoned',
    });

    pollReturns(sessionStatus('retry'));

    expect(
      await view.findByTestId(
        VbaKycRejectedSelectorsIDs.RETRY_BUTTON,
        {},
        { timeout: FLOW_TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(VbaKycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('relaunches SumSub when the polled session asks for a retry after submitting', async () => {
    const view = renderSubmittedVerification();
    await findPending(view);
    engineContext.RampsController.hydrateVbaOnboarding.mockResolvedValue(
      hydrated('retry'),
    );

    pollReturns(sessionStatus('retry'));

    await view.findByTestId(
      VbaSumSubKycSelectorsIDs.CONTAINER,
      {},
      { timeout: FLOW_TIMEOUT_MS },
    );
    expect(kyc().launchProviderFlow).toHaveBeenCalledTimes(2);
  });

  it.each<[string, KycSessionStatus | null]>([
    ['pending again', sessionStatus('pending')],
    ['new', sessionStatus('new')],
    // The controller swallows a failed poll (HTTP error or timeout) and keeps
    // the stored status, so nothing is written.
    ['an HTTP error or times out', null],
  ])('stays on pending when the status poll returns %s', async (_label, polled) => {
    const view = renderSubmittedVerification();
    await findPending(view);

    if (polled) {
      pollReturns(polled);
    }

    expect(
      await view.findByText(
        strings('virtual_bank_account.kyc_taking_longer.title'),
      ),
    ).toBeOnTheScreen();
    expect(
      engineContext.RampsController.hydrateVbaOnboarding,
    ).toHaveBeenCalledTimes(1);
  });

  it.each<[string, () => void]>([
    [
      'resuming the session gets a 404 for the session status',
      () =>
        kyc().startSession.mockRejectedValue(
          new HttpError(404, "Fetching '/sessions/session-1/status' failed"),
        ),
    ],
    [
      'resuming the session gets a 500 for the session status',
      () =>
        kyc().startSession.mockRejectedValue(
          new HttpError(500, "Fetching '/sessions/session-1/status' failed"),
        ),
    ],
    [
      'hydrating onboarding throws',
      () =>
        engineContext.RampsController.hydrateVbaOnboarding.mockRejectedValue(
          new Error('walletAddress is required after KYC acceptance.'),
        ),
    ],
  ])(
    'shows the setup error after an approved poll when %s',
    async (_label, failNextResolve) => {
      const view = renderSubmittedVerification();
      await findPending(view);
      failNextResolve();

      pollReturns(sessionStatus('approved'));

      expect(
        await view.findByText(
          strings('virtual_bank_account.error.title'),
          {},
          { timeout: FLOW_TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
    },
  );

  it('shows the SumSub error when the provider flow fails, then reaches pending on retry', async () => {
    kyc()
      .launchProviderFlow.mockReset()
      .mockResolvedValueOnce('failed')
      .mockResolvedValueOnce('submitted');
    const view = renderSubmittedVerification();

    expect(
      await view.findByText(
        strings('virtual_bank_account.sumsub_kyc.error_title'),
      ),
    ).toBeOnTheScreen();
    fireEvent.press(view.getByTestId(VbaSumSubKycSelectorsIDs.RETRY_BUTTON));

    expect(await findPending(view)).toBeOnTheScreen();
  });

  it('returns to Money home when the user closes SumSub before submitting', async () => {
    kyc().launchProviderFlow.mockReset().mockResolvedValue('abandoned');
    const view = renderSubmittedVerification();

    expect(
      await view.findByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
    ).toBeOnTheScreen();
    expect(
      engineContext.RampsController.hydrateVbaOnboarding,
    ).not.toHaveBeenCalled();
  });

  it.each(['fetchSessionDisclaimers', 'recordSessionDisclaimers'])(
    'shows the SumSub error without launching when %s fails',
    async (method) => {
      kyc()[method].mockRejectedValue(
        new HttpError(500, `Fetching '/sessions/session-1/disclaimers' failed`),
      );
      const view = renderSubmittedVerification();

      expect(
        await view.findByTestId(VbaSumSubKycSelectorsIDs.ERROR),
      ).toBeOnTheScreen();
      expect(kyc().launchProviderFlow).not.toHaveBeenCalled();
    },
  );

  it('shows the setup error when hydrating after submit fails', async () => {
    const view = renderSubmittedVerification('BR', () =>
      Promise.reject(new Error('hydrate failed')),
    );

    expect(
      await view.findByText(
        strings('virtual_bank_account.error.title'),
        {},
        { timeout: FLOW_TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(VbaKycPendingSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
  });
});
