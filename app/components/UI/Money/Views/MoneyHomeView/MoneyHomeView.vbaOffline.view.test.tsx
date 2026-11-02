import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import type nock from 'nock';
import type {
  KycProviderFlowStatus,
  KycSessionStatus,
} from '@metamask/kyc-controller';
import type { VbaOnboardingSnapshot as RampsVbaOnboardingSnapshot } from '@metamask/ramps-controller';
import { strings } from '../../../../../../locales/i18n';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import Engine from '../../../../../core/Engine';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  renderVbaMoneyHomeWithOnboarding,
  restoreVbaOfflineReduxServiceStore,
  setVbaNetInfo,
  VBA_OFFLINE_NET_INFO,
  VBA_ONLINE_NET_INFO,
} from '../../../../../../tests/component-view/renderers/vbaOffline';
import {
  clearOfflineAccountActivityApiMocks,
  setupOfflineAccountActivityApiMock,
} from '../../../../../../tests/component-view/api-mocking/vbaOfflineAccountActivity';
import { CreateVirtualBankAccountSelectorsIDs } from '../../../Ramp/Views/VirtualBankAccount/CreateVirtualBankAccount.testIds';
import { VbaOnboardingStubSelectorsIDs } from '../../../Ramp/Views/VirtualBankAccount/VbaOnboardingStub';
import { EMPTY_VBA_ONBOARDING_SNAPSHOT } from '../../../Ramp/Views/VirtualBankAccount/vbaOnboardingSnapshot';
import { MONEY_VBA_HOME_CARD_TEST_IDS } from '../../components/MoneyVbaHomeCard/MoneyVbaHomeCard.testIds';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { apiClient } from '../../../../../core/apiClient';

const SETUP_ERROR = `${VbaOnboardingStubSelectorsIDs.CONTAINER}-error`;

const session = (finalStatus: string, kycStatus: string): KycSessionStatus => ({
  id: 'kyc-session-1',
  finalStatus,
  externalUserId: 'external-user-1',
  kycStatus,
  vendor: 'sumsub',
  vendorStatus: 'completed',
});

const emptySnapshot = (): RampsVbaOnboardingSnapshot => {
  // The controller snapshot has no client-local vendor terms field.
  const { vendorTermsAcceptedLocally: _local, ...empty } =
    EMPTY_VBA_ONBOARDING_SNAPSHOT;
  return empty;
};

const homeOverrides = (
  sessionStatus: KycSessionStatus | null,
  providerFlowStatus: KycProviderFlowStatus,
): DeepPartial<RootState> =>
  ({
    user: {
      onboardingStepperProgress: { 'money-home-onboarding-stepper': 2 },
    },
    engine: {
      backgroundState: {
        KycController: { sessionStatus, providerFlowStatus },
        RampsController: {
          autoramps: [],
          moneyAccountWalletRegistrations: [],
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
  fetchSessionStatusOnce?: jest.Mock;
};

/** Money home balance, interest and APY reads through the Engine messenger. */
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

const renderHome = (
  sessionStatus: KycSessionStatus | null,
  providerFlowStatus: KycProviderFlowStatus = 'not_started',
) => {
  installKycSession(sessionStatus);
  return renderVbaMoneyHomeWithOnboarding({
    overrides: homeOverrides(sessionStatus, providerFlowStatus),
  });
};

/** Real-time wait so a skipped request would have had time to start. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });

describeForPlatforms('Money home VBA card with no connectivity', () => {
  let restoreEngine: (() => void) | undefined;
  let activityApi: nock.Scope;

  beforeEach(async () => {
    jest.clearAllMocks();
    // The activity page is cached on disk and in the apiClient query cache.
    // Without clearing both, the [android] run reuses the [ios] run's page and
    // never sends its own request.
    await StorageWrapper.clearAll();
    apiClient.clear();
    activityApi = setupOfflineAccountActivityApiMock();
    netInfoMock.__setMockNetInfo(VBA_OFFLINE_NET_INFO);
    restoreEngine = installMoneyHomeEngine();
  });

  afterEach(() => {
    restoreEngine?.();
    restoreEngine = undefined;
    installKycSession(null);
    delete kyc.fetchSessionStatusOnce;
    kyc.state = { sessionStatus: null };
    clearOfflineAccountActivityApiMocks();
    netInfoMock.__resetMockNetInfo();
    restoreVbaOfflineReduxServiceStore();
  });

  it('shows the saved kyc_pending card offline without refreshing the KYC session', async () => {
    const { findByTestId, getByTestId } = renderHome(
      session('pending', 'pending'),
      'submitted',
    );
    const ids = MONEY_VBA_HOME_CARD_TEST_IDS.kyc_pending;

    expect(await findByTestId(ids.CONTAINER)).toBeOnTheScreen();
    await settle();

    expect(getByTestId(ids.TITLE)).toHaveTextContent(
      strings('money.vba_home_card.kyc_pending.title'),
    );
    expect(getByTestId(ids.DESCRIPTION)).toHaveTextContent(
      strings('money.vba_home_card.kyc_pending.description'),
    );
    expect(kyc.fetchSessionStatusOnce).not.toHaveBeenCalled();
    // The activity request is not gated on connectivity; it fails at the
    // socket and the card still renders.
    expect(activityApi.isDone()).toBe(true);
  });

  it('refreshes the same kyc_pending session on focus when online', async () => {
    netInfoMock.__setMockNetInfo(VBA_ONLINE_NET_INFO);
    const { findByTestId } = renderHome(
      session('pending', 'pending'),
      'submitted',
    );

    expect(
      await findByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_pending.CONTAINER),
    ).toBeOnTheScreen();
    await waitFor(() =>
      expect(kyc.fetchSessionStatusOnce).toHaveBeenCalledWith('kyc-session-1'),
    );
  });

  it('does not refresh the KYC session when connectivity returns while Money home stays focused', async () => {
    const { findByTestId, getByTestId } = renderHome(
      session('pending', 'pending'),
      'submitted',
    );
    const ids = MONEY_VBA_HOME_CARD_TEST_IDS.kyc_pending;
    expect(await findByTestId(ids.CONTAINER)).toBeOnTheScreen();
    await settle();
    expect(kyc.fetchSessionStatusOnce).not.toHaveBeenCalled();

    // A reconnect that never takes focus off Money home: an outage shorter
    // than the 3 s before OfflineModeView opens, or a connection that stays
    // up (`isConnected`) while the internet is unreachable.
    await setVbaNetInfo(VBA_ONLINE_NET_INFO);
    await settle();

    // The focus refresh reads the tier through a ref and only runs on focus,
    // so the saved card stays as it was until the next focus.
    expect(kyc.fetchSessionStatusOnce).not.toHaveBeenCalled();
    expect(getByTestId(ids.TITLE)).toHaveTextContent(
      strings('money.vba_home_card.kyc_pending.title'),
    );
  });

  // Expected behaviour (finding C, bug draft): a reconnect while Money home
  // is focused refreshes the saved non-terminal KYC session once. Fails today
  // because `useVbaHomeCardRefresh` only fetches on focus.
  it.failing(
    'refreshes the KYC session once when connectivity returns while Money home stays focused',
    async () => {
      const { findByTestId } = renderHome(
        session('pending', 'pending'),
        'submitted',
      );
      expect(
        await findByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_pending.CONTAINER),
      ).toBeOnTheScreen();
      await settle();

      await setVbaNetInfo(VBA_ONLINE_NET_INFO);

      await waitFor(() =>
        expect(kyc.fetchSessionStatusOnce).toHaveBeenCalledWith(
          'kyc-session-1',
        ),
      );
      expect(kyc.fetchSessionStatusOnce).toHaveBeenCalledTimes(1);
    },
  );

  it('opens the generic setup error from the card offline, then reaches vendor terms on Try again once back online', async () => {
    ramps.hydrateVbaOnboarding
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValue(emptySnapshot());
    const { findByTestId, getByTestId, getByText, queryByTestId } =
      renderHome(null);
    const ids = MONEY_VBA_HOME_CARD_TEST_IDS.get_started;

    fireEvent.press(await findByTestId(ids.CTA_BUTTON));

    expect(await findByTestId(SETUP_ERROR)).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.error.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.error.description')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VbaOnboardingStubSelectorsIDs.CONTINUE_BUTTON),
    ).toHaveTextContent(strings('virtual_bank_account.error.button'));
    // No connectivity check before the request: the loading screen still
    // calls hydrate offline.
    expect(ramps.hydrateVbaOnboarding).toHaveBeenCalledTimes(1);

    netInfoMock.__setMockNetInfo(VBA_ONLINE_NET_INFO);
    fireEvent.press(getByTestId(VbaOnboardingStubSelectorsIDs.CONTINUE_BUTTON));

    expect(
      await findByTestId(CreateVirtualBankAccountSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(ramps.hydrateVbaOnboarding).toHaveBeenCalledTimes(2);
    expect(queryByTestId(SETUP_ERROR)).toBeNull();
  });

  it('stays on the generic setup error when Try again runs while still offline', async () => {
    ramps.hydrateVbaOnboarding.mockRejectedValue(
      new TypeError('Network request failed'),
    );
    const { findByTestId, getByTestId, queryByTestId } = renderHome(null);

    fireEvent.press(
      await findByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.get_started.CTA_BUTTON),
    );
    expect(await findByTestId(SETUP_ERROR)).toBeOnTheScreen();

    fireEvent.press(getByTestId(VbaOnboardingStubSelectorsIDs.CONTINUE_BUTTON));

    await waitFor(() =>
      expect(ramps.hydrateVbaOnboarding).toHaveBeenCalledTimes(2),
    );
    expect(await findByTestId(SETUP_ERROR)).toBeOnTheScreen();
    expect(
      queryByTestId(CreateVirtualBankAccountSelectorsIDs.CONTAINER),
    ).toBeNull();
  });
});
