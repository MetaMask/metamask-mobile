import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  AutorampStatus,
  type AutorampAccount,
  type MoneyAccountWalletRegistration,
  type RampsControllerState,
  type VbaOnboardingSnapshot,
} from '@metamask/ramps-controller';
import type {
  KycProviderFlowStatus,
  KycSessionStatus,
} from '@metamask/kyc-controller';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import {
  selectRampsControllerState,
  selectSelectedVbaWalletAddress,
  selectUsableVbaAutoramp,
} from '../../../../../../selectors/rampsController';
import {
  selectKycProviderFlowStatus,
  selectKycSessionStatus,
} from '../../../../../../selectors/kycController';
import { useVbaEligibility, type VbaEligibility } from './useVbaEligibility';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { hasAcceptedVbaVendorTerms } from '../vbaVendorTermsStorage';
import { getVbaKycStatusOverride } from '../vbaDevOverrides';
import {
  getVbaHomeCard,
  shouldRefreshKycSessionOnFocus,
  useVbaHomeCard,
  useVbaHomeCardRefresh,
  type VbaHomeCardInputs,
} from './useVbaHomeCard';

jest.mock('react-redux');
jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      KycController: {
        fetchSessionStatusOnce: jest.fn(),
        refreshSessionStatus: jest.fn(),
        startSessionStatusPolling: jest.fn(),
        clearState: jest.fn(),
        state: { sessionStatus: null as KycSessionStatus | null },
      },
      RampsController: {
        hydrateVbaOnboarding: jest.fn(),
        refreshAutoramps: jest.fn(),
        state: { autoramps: [] as AutorampAccount[] },
      },
    },
  },
}));
jest.mock('../../../../../../selectors/rampsController');
jest.mock('../../../../../../selectors/kycController');
jest.mock('./useVbaEligibility');
jest.mock('../../../../../../hooks/useNetworkTier');
jest.mock('../vbaVendorTermsStorage');
jest.mock('../vbaDevOverrides', () => ({
  ...jest.requireActual('../vbaDevOverrides'),
  getVbaKycStatusOverride: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseVbaEligibility = jest.mocked(useVbaEligibility);
const mockSelectSelectedVbaWalletAddress = jest.mocked(
  selectSelectedVbaWalletAddress,
);
const mockSelectRampsControllerState = jest.mocked(selectRampsControllerState);
const mockSelectUsableVbaAutoramp = jest.mocked(selectUsableVbaAutoramp);
const mockSelectKycSessionStatus = jest.mocked(selectKycSessionStatus);
const mockSelectKycProviderFlowStatus = jest.mocked(
  selectKycProviderFlowStatus,
);
const mockHasAcceptedVbaVendorTerms = jest.mocked(hasAcceptedVbaVendorTerms);
const mockGetVbaKycStatusOverride = jest.mocked(getVbaKycStatusOverride);
const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
  typeof useFocusEffect
>;
const mockHydrateVbaOnboarding = jest.mocked(
  Engine.context.RampsController.hydrateVbaOnboarding,
);
const mockFetchSessionStatusOnce = jest.mocked(
  Engine.context.KycController.fetchSessionStatusOnce,
);
const mockClearState = jest.mocked(Engine.context.KycController.clearState);
const mockRefreshSessionStatus = jest.mocked(
  Engine.context.KycController.refreshSessionStatus,
);
const mockStartSessionStatusPolling = jest.mocked(
  Engine.context.KycController.startSessionStatusPolling,
);
const mockUseNetworkTier = jest.mocked(useNetworkTier);

const WALLET = '0xMoneyAccountWallet';
const OTHER_WALLET = '0xOtherWallet';

const makeEligibility = (
  overrides: Partial<VbaEligibility> = {},
): VbaEligibility => ({
  isEligible: true,
  isLoading: false,
  isFlagEnabled: true,
  isRegionEligible: true,
  isDevBypassEnabled: false,
  location: 'BR',
  ...overrides,
});

const makeSession = (
  overrides: Partial<KycSessionStatus> = {},
): KycSessionStatus => ({
  id: 'session-1',
  finalStatus: 'pending',
  kycStatus: 'pending',
  externalUserId: 'profile-1',
  vendor: 'sumsub',
  vendorStatus: 'pending',
  ...overrides,
});

const makeAutoramp = (
  overrides: Partial<AutorampAccount> = {},
): AutorampAccount =>
  ({
    id: 'autoramp-1',
    customerId: 'customer-1',
    walletAddress: WALLET,
    status: AutorampStatus.Approved,
    lastSeenStatus: AutorampStatus.Approved,
    updatedAt: 1,
    ...overrides,
  }) as AutorampAccount;

const makeRegistration = (
  overrides: Partial<MoneyAccountWalletRegistration> = {},
): MoneyAccountWalletRegistration => ({
  walletAddress: WALLET,
  status: 'active',
  updatedAt: 1,
  ...overrides,
});

const baseInputs: VbaHomeCardInputs = {
  isEligible: true,
  isEligibilityLoading: false,
  walletAddress: WALLET,
  sessionStatus: null,
  providerFlowStatus: 'not_started',
  hasAcceptedVendorTerms: false,
  autoramps: [],
  walletRegistrations: [],
  hasUsableAutoramp: false,
};

describe('getVbaHomeCard', () => {
  it('renders no card when the user is not eligible', () => {
    const card = getVbaHomeCard({ ...baseInputs, isEligible: false });

    expect(card).toEqual({ type: 'none' });
  });

  it('renders no card while the geo lookup is still loading', () => {
    const card = getVbaHomeCard({ ...baseInputs, isEligibilityLoading: true });

    expect(card).toEqual({ type: 'none' });
  });

  it('renders no card without a selected wallet (decision rule 1)', () => {
    const card = getVbaHomeCard({ ...baseInputs, walletAddress: null });

    expect(card).toEqual({ type: 'none' });
  });

  it('renders no card when a usable autoramp exists without an approved session', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      autoramps: [makeAutoramp({ status: AutorampStatus.Created })],
    });

    // The autoramp is evidence, so not get_started either; without an approved
    // session no card fits.
    expect(card).toEqual({ type: 'none' });
  });

  it('renders account_is_ready for an approved session with a usable autoramp (decision rule 3)', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      sessionStatus: makeSession({
        finalStatus: 'approved',
        kycStatus: 'approved',
      }),
      autoramps: [makeAutoramp()],
    });

    expect(card).toEqual({ type: 'account_is_ready' });
  });

  it('renders kyc_pending for a pending session even with a usable autoramp', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      sessionStatus: makeSession(),
      autoramps: [makeAutoramp()],
    });

    expect(card).toEqual({ type: 'kyc_pending' });
  });

  it('ignores autoramps belonging to a different wallet', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      autoramps: [makeAutoramp({ walletAddress: OTHER_WALLET })],
    });

    // No evidence for this wallet at all -> fresh start.
    expect(card).toEqual({ type: 'get_started' });
  });

  it('matches autoramp wallet addresses case-insensitively', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      walletAddress: WALLET.toLowerCase(),
      autoramps: [makeAutoramp({ walletAddress: WALLET.toUpperCase() })],
    });

    expect(card).toEqual({ type: 'none' });
  });

  it('does not treat a Rejected autoramp as usable', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      autoramps: [makeAutoramp({ status: AutorampStatus.Rejected })],
    });

    // Dead route is evidence, so not get_started either; nothing fits yet.
    expect(card).toEqual({ type: 'none' });
  });

  it('does not treat a Cancelled autoramp as usable', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      autoramps: [makeAutoramp({ status: AutorampStatus.Cancelled })],
    });

    expect(card).toEqual({ type: 'none' });
  });

  it('renders get_started for a brand-new user (decision rule 3)', () => {
    const card = getVbaHomeCard(baseInputs);

    expect(card).toEqual({ type: 'get_started' });
  });

  it('does not render get_started when a registration row exists, even disabled', () => {
    const disabled = getVbaHomeCard({
      ...baseInputs,
      walletRegistrations: [makeRegistration({ status: 'disabled' })],
    });
    const active = getVbaHomeCard({
      ...baseInputs,
      walletRegistrations: [makeRegistration({ status: 'active' })],
    });

    // Registration evidence rules out a fresh start; with no session or terms
    // no other card fits yet.
    expect(disabled).toEqual({ type: 'none' });
    expect(active).toEqual({ type: 'none' });
  });

  it('renders account_is_ready for an approved session while no usable autoramp exists (decision rule 3)', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      sessionStatus: makeSession({
        finalStatus: 'approved',
        kycStatus: 'pending',
      }),
    });

    expect(card).toEqual({ type: 'account_is_ready' });
  });

  it.each([AutorampStatus.Rejected, AutorampStatus.Cancelled])(
    'renders account_is_ready for an approved session whose only autoramp is %s (decision rule 3)',
    (status) => {
      const card = getVbaHomeCard({
        ...baseInputs,
        sessionStatus: makeSession({
          finalStatus: 'approved',
          kycStatus: 'approved',
        }),
        autoramps: [makeAutoramp({ status })],
      });

      expect(card).toEqual({ type: 'account_is_ready' });
    },
  );

  it('renders account_is_ready when only kycStatus is approved (relay approval counts)', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      sessionStatus: makeSession({
        finalStatus: 'pending',
        kycStatus: 'approved',
      }),
      autoramps: [makeAutoramp()],
    });

    expect(card).toEqual({ type: 'account_is_ready' });
  });

  it('renders the kyc_decision stub when finalStatus is rejected (decision rule 5)', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      sessionStatus: makeSession({
        finalStatus: 'rejected',
        kycStatus: 'rejected',
      }),
      hasAcceptedVendorTerms: true,
    });

    expect(card).toEqual({ type: 'kyc_decision' });
  });

  it('renders the kyc_decision stub when finalStatus is retry (decision rule 5)', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      sessionStatus: makeSession({
        finalStatus: 'retry',
        kycStatus: 'retry',
      }),
    });

    expect(card).toEqual({ type: 'kyc_decision' });
  });

  it('renders kyc_pending when the relay kycStatus is pending (decision rule 5)', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      sessionStatus: makeSession(),
    });

    expect(card).toEqual({ type: 'kyc_pending' });
  });

  it('renders kyc_pending when only kycStatus is pending', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      sessionStatus: makeSession({
        finalStatus: 'new',
        kycStatus: 'pending',
      }),
    });

    expect(card).toEqual({ type: 'kyc_pending' });
  });

  it('renders kyc_pending when the provider flow was submitted on a fresh session', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      sessionStatus: makeSession({
        finalStatus: 'new',
        kycStatus: 'new',
      }),
      providerFlowStatus: 'submitted',
    });

    expect(card).toEqual({ type: 'kyc_pending' });
  });

  it('renders finish_verification when terms are accepted without a session (decision rule 7)', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      hasAcceptedVendorTerms: true,
    });

    expect(card).toEqual({ type: 'finish_verification' });
  });

  it('renders finish_verification for an incomplete non-terminal session', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      sessionStatus: makeSession({
        finalStatus: 'new',
        kycStatus: 'new',
      }),
      providerFlowStatus: 'abandoned',
      hasAcceptedVendorTerms: true,
    });

    expect(card).toEqual({ type: 'finish_verification' });
  });

  it('renders finish_verification for an abandoned flow despite a pending finalStatus', () => {
    // Device-observed state (TRAM-4079): after backing out of SumSub, the
    // relay keeps `finalStatus: 'pending'` while `kycStatus` is still 'new'
    // and the provider flow is 'abandoned'. Nothing is being reviewed, so the
    // card must ask the user to finish verification, not spin.
    const card = getVbaHomeCard({
      ...baseInputs,
      sessionStatus: makeSession({
        finalStatus: 'pending',
        kycStatus: 'new',
      }),
      providerFlowStatus: 'abandoned',
      hasAcceptedVendorTerms: true,
    });

    expect(card).toEqual({ type: 'finish_verification' });
  });

  it('ranks a submitted flow (rule 6) above finish_verification (rule 7)', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      sessionStatus: makeSession({
        finalStatus: 'new',
        kycStatus: 'new',
      }),
      providerFlowStatus: 'submitted',
      hasAcceptedVendorTerms: true,
    });

    expect(card).toEqual({ type: 'kyc_pending' });
  });

  it('renders no card when no rule matches', () => {
    // A dead autoramp cursor with no session, terms, or registration: rules
    // 2-6 all fail. Reinstall discovery is a follow-up.
    const card = getVbaHomeCard({
      ...baseInputs,
      autoramps: [makeAutoramp({ status: AutorampStatus.Rejected })],
    });

    expect(card).toEqual({ type: 'none' });
  });

  it('bypasses the eligibility guard when a usable autoramp exists', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      isEligible: false,
      isEligibilityLoading: true,
      hasUsableAutoramp: true,
      sessionStatus: makeSession({
        finalStatus: 'approved',
        kycStatus: 'approved',
      }),
    });

    expect(card).toEqual({ type: 'account_is_ready' });
  });

  it.each(['rejected', 'retry'] as const)(
    'renders account_is_ready over a stale %s session when a usable autoramp exists',
    (finalStatus) => {
      const card = getVbaHomeCard({
        ...baseInputs,
        hasUsableAutoramp: true,
        hasAcceptedVendorTerms: true,
        sessionStatus: makeSession({ finalStatus, kycStatus: finalStatus }),
      });

      expect(card).toEqual({ type: 'account_is_ready' });
    },
  );

  it('renders account_is_ready via the grandfather rule when every session-based rule fails', () => {
    // No session, terms, or registration (rules 2 and 6 fail), but a usable
    // autoramp exists on the Money account.
    const card = getVbaHomeCard({
      ...baseInputs,
      hasUsableAutoramp: true,
      autoramps: [makeAutoramp({ status: AutorampStatus.Rejected })],
    });

    expect(card).toEqual({ type: 'account_is_ready' });
  });

  it('still renders no card when there is no usable autoramp and no rule matches', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      hasUsableAutoramp: false,
      autoramps: [makeAutoramp({ status: AutorampStatus.Rejected })],
    });

    expect(card).toEqual({ type: 'none' });
  });
});

describe('shouldRefreshKycSessionOnFocus', () => {
  it.each(['new', 'pending'])(
    'returns true for a non-terminal session (%s)',
    (finalStatus) => {
      expect(shouldRefreshKycSessionOnFocus(finalStatus)).toBe(true);
    },
  );

  it.each(['approved', 'rejected', 'retry'])(
    'returns false for a terminal session (%s)',
    (finalStatus) => {
      expect(shouldRefreshKycSessionOnFocus(finalStatus)).toBe(false);
    },
  );

  it('returns false without a session', () => {
    expect(shouldRefreshKycSessionOnFocus(null)).toBe(false);
  });
});

describe('useVbaHomeCard', () => {
  const setupSelectors = ({
    eligibility,
    walletAddress = WALLET,
    sessionStatus = null,
    providerFlowStatus = 'not_started',
    autoramps = [],
    walletRegistrations = [],
    hasUsableAutoramp = false,
  }: {
    eligibility?: Partial<VbaEligibility>;
    walletAddress?: string | null;
    sessionStatus?: KycSessionStatus | null;
    providerFlowStatus?: KycProviderFlowStatus;
    autoramps?: AutorampAccount[];
    walletRegistrations?: MoneyAccountWalletRegistration[];
    hasUsableAutoramp?: boolean;
  } = {}) => {
    mockUseVbaEligibility.mockReturnValue(makeEligibility(eligibility));
    mockSelectSelectedVbaWalletAddress.mockReturnValue(walletAddress);
    mockSelectKycSessionStatus.mockReturnValue(sessionStatus);
    mockSelectKycProviderFlowStatus.mockReturnValue(providerFlowStatus);
    mockSelectRampsControllerState.mockReturnValue({
      autoramps,
      moneyAccountWalletRegistrations: walletRegistrations,
    } as RampsControllerState);
    mockSelectUsableVbaAutoramp.mockReturnValue(
      hasUsableAutoramp ? makeAutoramp() : undefined,
    );
    mockHasAcceptedVbaVendorTerms.mockResolvedValue(false);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetVbaKycStatusOverride.mockReset();
    mockUseSelector.mockImplementation((selector) =>
      selector(undefined as never),
    );
    mockHydrateVbaOnboarding.mockResolvedValue({} as VbaOnboardingSnapshot);
  });

  it('does not hit the network on load', () => {
    setupSelectors();

    renderHook(() => useVbaHomeCard());

    expect(mockHydrateVbaOnboarding).not.toHaveBeenCalled();
  });

  it('resolves the card from Redux state', () => {
    setupSelectors({
      sessionStatus: makeSession(),
    });

    const { result } = renderHook(() => useVbaHomeCard());

    expect(result.current).toEqual({ type: 'kyc_pending' });
  });

  it('honors the dev KYC status override for the card decision', () => {
    mockGetVbaKycStatusOverride.mockReturnValue('rejected');
    setupSelectors({
      sessionStatus: makeSession({
        finalStatus: 'pending',
        kycStatus: 'new',
      }),
    });

    const { result } = renderHook(() => useVbaHomeCard());

    expect(result.current).toEqual({ type: 'kyc_decision' });
  });

  it('treats local vendor terms as not accepted while loading, then flips once accepted', async () => {
    setupSelectors();

    let resolveTerms: (accepted: boolean) => void = () => undefined;
    mockHasAcceptedVbaVendorTerms.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveTerms = resolve;
        }),
    );

    const { result } = renderHook(() => useVbaHomeCard());
    expect(result.current).toEqual({ type: 'get_started' });

    await act(async () => {
      resolveTerms(true);
    });

    await waitFor(() => {
      expect(result.current).toEqual({ type: 'finish_verification' });
    });
    expect(mockHasAcceptedVbaVendorTerms).toHaveBeenCalledWith(WALLET);
  });

  it('keeps get_started when local terms resolve as not accepted', async () => {
    setupSelectors();

    const { result } = renderHook(() => useVbaHomeCard());
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toEqual({ type: 'get_started' });
  });

  it('re-reads local terms and resets to not accepted when the wallet changes', async () => {
    mockHasAcceptedVbaVendorTerms
      .mockResolvedValueOnce(true) // WALLET
      .mockResolvedValueOnce(false); // OTHER_WALLET
    setupSelectors();

    const { result, rerender } = renderHook(() => useVbaHomeCard());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toEqual({ type: 'finish_verification' });

    mockSelectSelectedVbaWalletAddress.mockReturnValue(OTHER_WALLET);
    rerender();

    // New wallet: treated as not accepted while the fresh read is in flight.
    expect(result.current).toEqual({ type: 'get_started' });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toEqual({ type: 'get_started' });
    expect(mockHasAcceptedVbaVendorTerms).toHaveBeenNthCalledWith(1, WALLET);
    expect(mockHasAcceptedVbaVendorTerms).toHaveBeenNthCalledWith(
      2,
      OTHER_WALLET,
    );
  });
});

describe('useVbaHomeCardRefresh', () => {
  // The hook's `useCallback` result captured by the `useFocusEffect` mock.
  // Tests assert its identity to lock dependency lists.
  let storedFocusCallback: (() => undefined | (() => void)) | undefined;
  let isFocused = false;
  // Invoking `focusCallback` is the focus event. While focused, the mock
  // re-runs a replacement callback the moment its identity changes — React
  // Navigation's semantics, which are what make dependency-list regressions
  // (a mid-focus rerun firing a second GET) visible to these tests.
  const focusCallback = (): undefined | (() => void) => {
    isFocused = true;
    return storedFocusCallback?.();
  };

  const setupRefreshSelectors = ({
    isEligible = true,
    walletAddress = WALLET,
    sessionStatus = null,
  }: {
    isEligible?: boolean;
    walletAddress?: string | null;
    sessionStatus?: KycSessionStatus | null;
  } = {}) => {
    mockUseVbaEligibility.mockReturnValue(makeEligibility({ isEligible }));
    mockSelectSelectedVbaWalletAddress.mockReturnValue(walletAddress);
    // The refresh hook reads the session from Engine state at focus time.
    Engine.context.KycController.state.sessionStatus = sessionStatus;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    storedFocusCallback = undefined;
    isFocused = false;
    Engine.context.KycController.state.sessionStatus = null;
    mockClearState.mockImplementation(() => {
      Engine.context.KycController.state.sessionStatus = null;
    });
    mockUseSelector.mockImplementation((selector) =>
      selector(undefined as never),
    );
    mockUseFocusEffect.mockImplementation((callback) => {
      const next = callback as () => undefined | (() => void);
      const changed = storedFocusCallback !== next;
      storedFocusCallback = next;
      if (changed && isFocused) {
        next();
      }
    });
    // Unknown network takes the product default — never read as offline.
    mockUseNetworkTier.mockReturnValue(null);
    Engine.context.RampsController.state.autoramps = [];
    mockFetchSessionStatusOnce.mockResolvedValue(makeSession());
    Engine.context.KycController.state.sessionStatus = null;
  });

  it('does not fetch during initial render before focus', () => {
    setupRefreshSelectors({ sessionStatus: makeSession() });

    renderHook(() => useVbaHomeCardRefresh());

    expect(mockFetchSessionStatusOnce).not.toHaveBeenCalled();
    expect(mockHydrateVbaOnboarding).not.toHaveBeenCalled();
  });

  it('fetches the stored session status once with its session id on focus', () => {
    setupRefreshSelectors({ sessionStatus: makeSession() });

    renderHook(() => useVbaHomeCardRefresh());
    focusCallback();

    expect(mockFetchSessionStatusOnce).toHaveBeenCalledTimes(1);
    expect(mockFetchSessionStatusOnce).toHaveBeenCalledWith('session-1');
    expect(mockHydrateVbaOnboarding).not.toHaveBeenCalled();
  });

  it('fetches once per focus: the next focus may fetch again', async () => {
    setupRefreshSelectors({ sessionStatus: makeSession() });

    renderHook(() => useVbaHomeCardRefresh());
    await act(async () => {
      focusCallback();
    });
    await act(async () => {
      focusCallback();
    });

    expect(mockFetchSessionStatusOnce).toHaveBeenCalledTimes(2);
  });

  it('makes no VBA request when the eligibility gate fails (flag or region)', () => {
    setupRefreshSelectors({ isEligible: false, sessionStatus: makeSession() });

    renderHook(() => useVbaHomeCardRefresh());
    focusCallback();

    expect(mockFetchSessionStatusOnce).not.toHaveBeenCalled();
    expect(mockHydrateVbaOnboarding).not.toHaveBeenCalled();
  });

  it('makes no VBA request while the geo lookup is still loading', () => {
    mockUseVbaEligibility.mockReturnValue(
      makeEligibility({ isEligible: false, isLoading: true }),
    );
    mockSelectSelectedVbaWalletAddress.mockReturnValue(WALLET);
    mockSelectKycSessionStatus.mockReturnValue(makeSession());

    renderHook(() => useVbaHomeCardRefresh());
    focusCallback();

    expect(mockFetchSessionStatusOnce).not.toHaveBeenCalled();
  });

  it('makes no VBA request without a selected wallet', () => {
    setupRefreshSelectors({
      sessionStatus: makeSession(),
      walletAddress: null,
    });

    renderHook(() => useVbaHomeCardRefresh());
    focusCallback();

    expect(mockFetchSessionStatusOnce).not.toHaveBeenCalled();
  });

  it('makes no VBA request without a persisted session', () => {
    setupRefreshSelectors({ sessionStatus: null });

    renderHook(() => useVbaHomeCardRefresh());
    focusCallback();

    expect(mockFetchSessionStatusOnce).not.toHaveBeenCalled();
    expect(mockHydrateVbaOnboarding).not.toHaveBeenCalled();
  });

  it.each(['approved', 'rejected', 'retry'])(
    'makes no session GET for a terminal stored status (%s)',
    (finalStatus) => {
      setupRefreshSelectors({
        sessionStatus: makeSession({ finalStatus }),
      });

      renderHook(() => useVbaHomeCardRefresh());
      focusCallback();

      expect(mockFetchSessionStatusOnce).not.toHaveBeenCalled();
    },
  );

  it('makes no VBA request when the network is known to be offline', () => {
    mockUseNetworkTier.mockReturnValue('NONE');
    setupRefreshSelectors({ sessionStatus: makeSession() });

    renderHook(() => useVbaHomeCardRefresh());
    focusCallback();

    expect(mockFetchSessionStatusOnce).not.toHaveBeenCalled();
  });

  it('fetches on the next focus after the network recovers, not mid-focus', () => {
    mockUseNetworkTier.mockReturnValue('NONE');
    setupRefreshSelectors({ sessionStatus: makeSession() });
    const { rerender } = renderHook(() => useVbaHomeCardRefresh());
    const storedCallbackBefore = storedFocusCallback;
    focusCallback();

    expect(mockFetchSessionStatusOnce).not.toHaveBeenCalled();

    // A tier change alone must not re-arm the refresh: the gate reads the
    // latest tier at call time, and the GET waits for the next focus.
    mockUseNetworkTier.mockReturnValue(null);
    rerender();

    // The tier is not a dependency: the focus callback identity is stable, so
    // React Navigation's rerun-on-callback-change semantics cannot refire the
    // GET mid-focus. If networkTier re-enters the dependency list, the new
    // callback identity fails this assertion.
    expect(storedFocusCallback).toBe(storedCallbackBefore);
    expect(mockFetchSessionStatusOnce).not.toHaveBeenCalled();

    focusCallback();

    expect(mockFetchSessionStatusOnce).toHaveBeenCalledTimes(1);
    expect(mockFetchSessionStatusOnce).toHaveBeenCalledWith('session-1');
  });

  it('fetches on the rerender when the user becomes eligible while already focused', () => {
    setupRefreshSelectors({ isEligible: false, sessionStatus: makeSession() });
    const { rerender } = renderHook(() => useVbaHomeCardRefresh());
    focusCallback();

    expect(mockFetchSessionStatusOnce).not.toHaveBeenCalled();

    // Eligibility is a dependency on purpose: the geo lookup resolving
    // mid-focus builds a new callback, React Navigation runs it at once, and
    // the card catches up without waiting for the next focus. Reading
    // `isEligible` through a ref (like the tier) would keep the identity
    // stable, skip this run, and leave the card stale on the cold open.
    mockUseVbaEligibility.mockReturnValue(makeEligibility());
    rerender();

    expect(mockFetchSessionStatusOnce).toHaveBeenCalledTimes(1);
    expect(mockFetchSessionStatusOnce).toHaveBeenCalledWith('session-1');
  });

  it('stays one GET when the fetched status writes mid-focus', async () => {
    const stored = makeSession({ finalStatus: 'new' });
    const fetched = makeSession({ finalStatus: 'pending' });
    mockFetchSessionStatusOnce.mockImplementation(async () => {
      // The real controller writes the resolved session onto its state.
      Engine.context.KycController.state.sessionStatus = fetched;
      return fetched;
    });
    setupRefreshSelectors({ sessionStatus: stored });
    const { rerender } = renderHook(() => useVbaHomeCardRefresh());

    await act(async () => {
      focusCallback();
      // The write lands while Money home stays focused. The gate reads the
      // session from Engine state at call time — not from a dependency — so
      // the write must not rebuild the callback and refire the GET.
      rerender();
    });

    expect(mockFetchSessionStatusOnce).toHaveBeenCalledTimes(1);
    expect(mockFetchSessionStatusOnce).toHaveBeenCalledWith('session-1');
  });

  it('starts no polling loop after the one-shot fetch', () => {
    jest.useFakeTimers();
    try {
      setupRefreshSelectors({ sessionStatus: makeSession() });

      renderHook(() => useVbaHomeCardRefresh());
      focusCallback();
      // Outlive the KYC 15s poll cadence.
      jest.advanceTimersByTime(45_000);

      expect(mockFetchSessionStatusOnce).toHaveBeenCalledTimes(1);
      expect(mockStartSessionStatusPolling).not.toHaveBeenCalled();
      expect(mockRefreshSessionStatus).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('logs and swallows a failed session fetch', async () => {
    const errorSpy = jest
      .spyOn(Logger, 'error')
      .mockImplementation(() => undefined);
    const failure = new Error('session status fetch failed');
    mockFetchSessionStatusOnce.mockRejectedValue(failure);
    setupRefreshSelectors({ sessionStatus: makeSession() });

    renderHook(() => useVbaHomeCardRefresh());
    await act(async () => {
      focusCallback();
    });

    expect(errorSpy).toHaveBeenCalledWith(
      failure,
      expect.objectContaining({
        tags: expect.objectContaining({ feature: 'money-home' }),
        context: expect.objectContaining({
          name: 'useVbaHomeCardRefresh',
          data: { walletAddress: WALLET },
        }),
      }),
    );
    errorSpy.mockRestore();
  });

  it('clears stale KYC state instead of logging when the session GET 404s', async () => {
    const errorSpy = jest
      .spyOn(Logger, 'error')
      .mockImplementation(() => undefined);
    const notFound = Object.assign(new Error('session not found'), {
      httpStatus: 404,
    });
    mockFetchSessionStatusOnce.mockRejectedValue(notFound);
    setupRefreshSelectors({ sessionStatus: makeSession() });

    renderHook(() => useVbaHomeCardRefresh());
    await act(async () => {
      focusCallback();
    });

    expect(mockClearState).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();

    // The cleared state is gone: a refocus must not send another GET.
    focusCallback();
    expect(mockFetchSessionStatusOnce).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });
});
