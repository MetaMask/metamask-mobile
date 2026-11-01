import '../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import type {
  KycProviderFlowStatus,
  KycSessionStatus,
} from '@metamask/kyc-controller';
import {
  AutorampStatus,
  type AutorampAccount,
  type MoneyAccountWalletRegistration,
  type VbaOnboardingSnapshot as RampsVbaOnboardingSnapshot,
} from '@metamask/ramps-controller';
import { strings } from '../../../../../../locales/i18n';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import Engine from '../../../../../core/Engine';
import StorageWrapper from '../../../../../store/storage-wrapper';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { getRouteParamsProbeTestId } from '../../../../../../tests/component-view/render';
import { VBA_TEST_MONEY_ADDRESS } from '../../../../../../tests/component-view/presets/vba';
import {
  renderVbaHomeCardMoneyHome,
  restoreVbaHomeCardReduxServiceStore,
} from '../../../../../../tests/component-view/renderers/vbaHomeCard';
import {
  clearMoneyHomeAccountActivityApiMocks,
  setupMoneyHomeAccountActivityApiMock,
} from '../../../../../../tests/component-view/api-mocking/moneyHomeAccountActivity';
import { VBA_KYC_VENDOR } from '../../../Ramp/Views/VirtualBankAccount/constants';
import { VbaOnboardingRoutes } from '../../../Ramp/Views/VirtualBankAccount/routes';
import { EMPTY_VBA_ONBOARDING_SNAPSHOT } from '../../../Ramp/Views/VirtualBankAccount/vbaOnboardingSnapshot';
import { saveVbaVendorTermsAcceptance } from '../../../Ramp/Views/VirtualBankAccount/vbaVendorTermsStorage';
import { MoneyHowItWorksTestIds } from '../../components/MoneyHowItWorks/MoneyHowItWorks.testIds';
import { MONEY_VBA_HOME_CARD_TEST_IDS } from '../../components/MoneyVbaHomeCard/MoneyVbaHomeCard.testIds';
import type { MoneyVbaHomeCardVariant } from '../../components/MoneyVbaHomeCard/MoneyVbaHomeCardConfig';

const VENDOR_TERMS_STORAGE_KEY = `@MetaMask:vbaTermsOneAccepted:v1:${VBA_TEST_MONEY_ADDRESS.toLowerCase()}`;

const session = (finalStatus: string, kycStatus: string): KycSessionStatus => ({
  id: 'kyc-session-1',
  finalStatus,
  externalUserId: 'external-user-1',
  kycStatus,
  vendor: 'sumsub',
  vendorStatus: 'completed',
});

const autoramp = (status: AutorampStatus): AutorampAccount => ({
  id: 'autoramp-1',
  customerId: 'customer-1',
  walletAddress: VBA_TEST_MONEY_ADDRESS,
  status,
  lastSeenStatus: status,
  updatedAt: 1_793_000_000_000,
});

const registration = (): MoneyAccountWalletRegistration => ({
  walletAddress: VBA_TEST_MONEY_ADDRESS,
  status: 'active',
  updatedAt: 1_793_000_000_000,
});

const hydrated = (
  snapshot: Partial<RampsVbaOnboardingSnapshot>,
): RampsVbaOnboardingSnapshot => {
  // The controller snapshot has no client-local vendor terms field.
  const { vendorTermsAcceptedLocally: _local, ...empty } =
    EMPTY_VBA_ONBOARDING_SNAPSHOT;
  return { ...empty, ...snapshot };
};

interface HomeState {
  sessionStatus?: KycSessionStatus | null;
  providerFlowStatus?: KycProviderFlowStatus;
  autoramps?: AutorampAccount[];
  walletRegistrations?: MoneyAccountWalletRegistration[];
}

const homeOverrides = ({
  sessionStatus = null,
  providerFlowStatus = 'not_started',
  autoramps = [],
  walletRegistrations = [],
}: HomeState): DeepPartial<RootState> =>
  ({
    user: {
      onboardingStepperProgress: { 'money-home-onboarding-stepper': 2 },
    },
    engine: {
      backgroundState: {
        KycController: { sessionStatus, providerFlowStatus },
        RampsController: {
          autoramps,
          moneyAccountWalletRegistrations: walletRegistrations,
        },
        PreferencesController: {
          tokenSortConfig: {
            key: 'tokenFiatAmount',
            order: 'dsc',
            sortCallback: 'stringNumeric',
          },
        },
      },
    },
  }) as unknown as DeepPartial<RootState>;

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;
const engineCall = Engine.controllerMessenger.call as jest.Mock;
const ramps = Engine.context.RampsController as unknown as {
  hydrateVbaOnboarding: jest.Mock;
};
const kyc = Engine.context.KycController as unknown as {
  state?: { sessionStatus: KycSessionStatus | null };
  readSessionStatus: jest.Mock;
  startSession: jest.Mock;
  fetchSessionStatusOnce?: jest.Mock;
};

const installMoneyHomeEngine = () => {
  const previous = engineCall.getMockImplementation();
  engineCall.mockImplementation((action: string, ...args: unknown[]) => {
    if (action === 'MoneyAccountBalanceService:fetchBalanceWithFallback') {
      return Promise.resolve({
        musdBalance: '0',
        vmusdValueInMusd: '0',
        totalBalance: '0',
        source: 'api',
        usedFallback: false,
      });
    }
    if (action === 'MoneyAccountApiDataService:fetchInterest') {
      return Promise.resolve({ interest_earned_usd: '0' });
    }
    if (action === 'MoneyAccountBalanceService:getVaultApy') {
      return Promise.resolve({ apy: '0.042' });
    }
    return previous ? previous(action, ...args) : Promise.resolve(undefined);
  });
  return () => {
    engineCall.mockImplementation(
      previous ?? (() => Promise.resolve(undefined)),
    );
  };
};

/** Mirrors KycController: Engine state and Redux hold the same session. */
const installKycSession = (sessionStatus: KycSessionStatus | null) => {
  kyc.state = { sessionStatus };
  kyc.readSessionStatus.mockReturnValue(sessionStatus);
  kyc.fetchSessionStatusOnce = jest.fn().mockResolvedValue(sessionStatus);
};

const ALL_VARIANTS = Object.keys(
  MONEY_VBA_HOME_CARD_TEST_IDS,
) as MoneyVbaHomeCardVariant[];

const renderHome = (state: HomeState) => {
  installKycSession(state.sessionStatus ?? null);
  return renderVbaHomeCardMoneyHome({ overrides: homeOverrides(state) });
};

const expectOnlyCard = (
  queryByTestId: (id: string) => unknown,
  variant: MoneyVbaHomeCardVariant,
) => {
  for (const other of ALL_VARIANTS.filter((v) => v !== variant)) {
    expect(
      queryByTestId(MONEY_VBA_HOME_CARD_TEST_IDS[other].CONTAINER),
    ).toBeNull();
  }
};

const expectCardCopy = (
  getByTestId: (id: string) => unknown,
  variant: MoneyVbaHomeCardVariant,
) => {
  const ids = MONEY_VBA_HOME_CARD_TEST_IDS[variant];
  const prefix = `money.vba_home_card.${variant}`;
  expect(getByTestId(ids.TITLE)).toHaveTextContent(strings(`${prefix}.title`));
  expect(getByTestId(ids.DESCRIPTION)).toHaveTextContent(
    strings(`${prefix}.description`),
  );
  expect(getByTestId(ids.CTA_BUTTON)).toHaveTextContent(
    strings(`${prefix}.cta`),
  );
};

const expectHydrated = () =>
  expect(ramps.hydrateVbaOnboarding).toHaveBeenCalledWith({
    walletAddress: expect.stringMatching(
      new RegExp(`^${VBA_TEST_MONEY_ADDRESS}$`, 'i'),
    ),
    refreshKyc: true,
    refreshAutoramps: true,
  });

describeForPlatforms('Money home VBA card variants', () => {
  let restoreEngine: (() => void) | undefined;

  beforeEach(async () => {
    jest.clearAllMocks();
    await StorageWrapper.removeItem(VENDOR_TERMS_STORAGE_KEY);
    setupMoneyHomeAccountActivityApiMock();
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    restoreEngine = installMoneyHomeEngine();
  });

  afterEach(async () => {
    restoreEngine?.();
    restoreEngine = undefined;
    installKycSession(null);
    delete kyc.fetchSessionStatusOnce;
    kyc.state = { sessionStatus: null };
    await StorageWrapper.removeItem(VENDOR_TERMS_STORAGE_KEY);
    clearMoneyHomeAccountActivityApiMocks();
    netInfoMock.__resetMockNetInfo();
    restoreVbaHomeCardReduxServiceStore();
  });

  it('shows get_started for a new user and its CTA opens vendor terms', async () => {
    ramps.hydrateVbaOnboarding.mockResolvedValue(hydrated({}));
    const { findByTestId, getByTestId, queryByTestId } = renderHome({});
    const ids = MONEY_VBA_HOME_CARD_TEST_IDS.get_started;

    expect(await findByTestId(ids.CONTAINER)).toBeOnTheScreen();
    expectCardCopy(getByTestId, 'get_started');
    expectOnlyCard(queryByTestId, 'get_started');

    fireEvent.press(getByTestId(ids.CTA_BUTTON));

    expect(
      await findByTestId(
        getRouteParamsProbeTestId(VbaOnboardingRoutes.VENDOR_TERMS),
      ),
    ).toHaveTextContent(/^$/);
    expectHydrated();
    expect(kyc.startSession).not.toHaveBeenCalled();
  });

  it('shows kyc_pending for a submitted session and its CTA opens KYC pending', async () => {
    const pending = session('pending', 'pending');
    ramps.hydrateVbaOnboarding.mockResolvedValue(
      hydrated({
        sessionExists: true,
        vendorDisclaimersComplete: true,
        sessionDisclaimersComplete: true,
        providerFlowStatus: 'submitted',
        kycStatus: 'pending',
      }),
    );
    const { findByTestId, getByTestId, queryByTestId } = renderHome({
      sessionStatus: pending,
      providerFlowStatus: 'submitted',
    });
    const ids = MONEY_VBA_HOME_CARD_TEST_IDS.kyc_pending;

    expect(await findByTestId(ids.CONTAINER)).toBeOnTheScreen();
    expectCardCopy(getByTestId, 'kyc_pending');
    expectOnlyCard(queryByTestId, 'kyc_pending');
    await waitFor(() => {
      expect(kyc.fetchSessionStatusOnce).toHaveBeenCalledWith(pending.id);
    });
    expect(kyc.fetchSessionStatusOnce).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId(ids.CTA_BUTTON));

    expect(
      await findByTestId(
        getRouteParamsProbeTestId(VbaOnboardingRoutes.KYC_PENDING),
      ),
    ).toHaveTextContent(/^$/);
    expectHydrated();
    expect(kyc.startSession).toHaveBeenCalledWith({ vendor: VBA_KYC_VENDOR });
  });

  it.each([
    {
      name: 'the relay decision is pending',
      sessionStatus: session('pending', 'pending'),
      providerFlowStatus: 'not_started' as const,
    },
    {
      name: 'the provider flow was submitted',
      sessionStatus: session('pending', 'new'),
      providerFlowStatus: 'submitted' as const,
    },
  ])(
    'picks kyc_pending when only $name',
    async ({ sessionStatus, providerFlowStatus }) => {
      const { findByTestId, getByTestId, queryByTestId } = renderHome({
        sessionStatus,
        providerFlowStatus,
      });

      expect(
        await findByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_pending.CONTAINER),
      ).toBeOnTheScreen();
      expectCardCopy(getByTestId, 'kyc_pending');
      expectOnlyCard(queryByTestId, 'kyc_pending');
    },
  );

  it('shows finish_verification for an abandoned session and its CTA reopens identity verification with the snapshot', async () => {
    const abandoned = session('pending', 'new');
    const snapshot = hydrated({
      sessionExists: true,
      vendorDisclaimersComplete: true,
      sessionDisclaimersComplete: true,
      providerFlowStatus: 'abandoned',
      kycStatus: 'new',
    });
    ramps.hydrateVbaOnboarding.mockResolvedValue(snapshot);
    const { findByTestId, getByTestId, queryByTestId } = renderHome({
      sessionStatus: abandoned,
      providerFlowStatus: 'abandoned',
    });
    const ids = MONEY_VBA_HOME_CARD_TEST_IDS.finish_verification;

    expect(await findByTestId(ids.CONTAINER)).toBeOnTheScreen();
    expectCardCopy(getByTestId, 'finish_verification');
    expectOnlyCard(queryByTestId, 'finish_verification');

    fireEvent.press(getByTestId(ids.CTA_BUTTON));

    const probe = await findByTestId(
      getRouteParamsProbeTestId(VbaOnboardingRoutes.IDENTITY_VERIFICATION),
    );
    expect(JSON.parse(String(probe.props.children))).toEqual({
      snapshot: { ...snapshot, vendorTermsAcceptedLocally: true },
    });
    expectHydrated();
  });

  it('shows finish_verification once vendor terms are accepted locally and its CTA opens email verification', async () => {
    await saveVbaVendorTermsAcceptance(VBA_TEST_MONEY_ADDRESS, [
      'moonpay-terms',
    ]);
    ramps.hydrateVbaOnboarding.mockResolvedValue(hydrated({}));
    const { findByTestId, getByTestId, queryByTestId } = renderHome({});
    const ids = MONEY_VBA_HOME_CARD_TEST_IDS.finish_verification;

    expect(await findByTestId(ids.CONTAINER)).toBeOnTheScreen();
    expectCardCopy(getByTestId, 'finish_verification');
    expectOnlyCard(queryByTestId, 'finish_verification');

    fireEvent.press(getByTestId(ids.CTA_BUTTON));

    expect(
      await findByTestId(getRouteParamsProbeTestId(VbaOnboardingRoutes.EMAIL)),
    ).toHaveTextContent(/^$/);
    expectHydrated();
  });

  it('shows kyc_decision for a rejected session and its CTA opens the rejected screen', async () => {
    ramps.hydrateVbaOnboarding.mockResolvedValue(
      hydrated({
        sessionExists: true,
        vendorDisclaimersComplete: true,
        sessionDisclaimersComplete: true,
        providerFlowStatus: 'submitted',
        kycStatus: 'rejected',
      }),
    );
    const { findByTestId, getByTestId, queryByTestId } = renderHome({
      sessionStatus: session('rejected', 'rejected'),
      providerFlowStatus: 'submitted',
    });
    const ids = MONEY_VBA_HOME_CARD_TEST_IDS.kyc_decision;

    expect(await findByTestId(ids.CONTAINER)).toBeOnTheScreen();
    expectCardCopy(getByTestId, 'kyc_decision');
    expectOnlyCard(queryByTestId, 'kyc_decision');
    expect(kyc.fetchSessionStatusOnce).not.toHaveBeenCalled();

    fireEvent.press(getByTestId(ids.CTA_BUTTON));

    expect(
      await findByTestId(
        getRouteParamsProbeTestId(VbaOnboardingRoutes.KYC_REJECTED),
      ),
    ).toHaveTextContent(/^$/);
    expectHydrated();
  });

  it('shows kyc_decision for a retry session and its CTA opens the rejected screen', async () => {
    ramps.hydrateVbaOnboarding.mockResolvedValue(
      hydrated({
        sessionExists: true,
        vendorDisclaimersComplete: true,
        sessionDisclaimersComplete: true,
        providerFlowStatus: 'not_started',
        kycStatus: 'retry',
      }),
    );
    const { findByTestId, getByTestId, queryByTestId } = renderHome({
      sessionStatus: session('retry', 'retry'),
    });
    const ids = MONEY_VBA_HOME_CARD_TEST_IDS.kyc_decision;

    expect(await findByTestId(ids.CONTAINER)).toBeOnTheScreen();
    expectCardCopy(getByTestId, 'kyc_decision');
    expectOnlyCard(queryByTestId, 'kyc_decision');

    fireEvent.press(getByTestId(ids.CTA_BUTTON));

    expect(
      await findByTestId(
        getRouteParamsProbeTestId(VbaOnboardingRoutes.KYC_REJECTED),
      ),
    ).toHaveTextContent(/^$/);
  });

  it('hides the kyc_decision card when Dismiss is pressed', async () => {
    const { findByTestId, getByTestId, queryByTestId } = renderHome({
      sessionStatus: session('rejected', 'rejected'),
      providerFlowStatus: 'submitted',
    });
    const ids = MONEY_VBA_HOME_CARD_TEST_IDS.kyc_decision;

    expect(await findByTestId(ids.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(ids.DISMISS_BUTTON as string)).toHaveTextContent(
      strings('money.vba_home_card.kyc_decision.dismiss'),
    );

    fireEvent.press(getByTestId(ids.DISMISS_BUTTON as string));

    await waitFor(() => {
      expect(queryByTestId(ids.CONTAINER)).toBeNull();
    });
    expect(ramps.hydrateVbaOnboarding).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'a registered wallet with no session or terms',
      state: { walletRegistrations: [registration()] },
      location: 'BR',
    },
    {
      name: 'a wallet whose only autoramp is Rejected',
      state: { autoramps: [autoramp(AutorampStatus.Rejected)] },
      location: 'BR',
    },
    {
      name: 'a user outside the enabled region',
      state: {},
      location: 'US',
    },
  ])('shows no VBA card for $name', async ({ state, location }) => {
    installKycSession(null);
    const { findByTestId, queryByTestId } = renderVbaHomeCardMoneyHome({
      location,
      overrides: homeOverrides(state),
    });

    expect(
      await findByTestId(MoneyHowItWorksTestIds.CONTAINER),
    ).toBeOnTheScreen();
    // Let the async vendor-terms read settle before asserting absence.
    await waitFor(() => {
      for (const variant of ALL_VARIANTS) {
        expect(
          queryByTestId(MONEY_VBA_HOME_CARD_TEST_IDS[variant].CONTAINER),
        ).toBeNull();
      }
    });
  });
});
