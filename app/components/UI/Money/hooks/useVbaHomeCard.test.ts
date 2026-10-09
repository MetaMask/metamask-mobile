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
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import {
  selectRampsControllerState,
  selectSelectedVbaWalletAddress,
} from '../../../../selectors/rampsController';
import {
  selectKycProviderFlowStatus,
  selectKycSessionStatus,
} from '../../../../selectors/kycController';
import {
  useVbaEligibility,
  type VbaEligibility,
} from '../../Ramp/Views/VirtualBankAccount/hooks/useVbaEligibility';
import { hasAcceptedVbaVendorTerms } from '../../Ramp/Views/VirtualBankAccount/vbaVendorTermsStorage';
import {
  getVbaHomeCard,
  shouldRefreshKycSessionOnFocus,
  useVbaHomeCard,
  useVbaHomeCardRefresh,
  type VbaHomeCardInputs,
} from './useVbaHomeCard';

jest.mock('react-redux');
jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      RampsController: {
        hydrateVbaOnboarding: jest.fn(),
      },
    },
  },
}));
jest.mock('../../../../selectors/rampsController');
jest.mock('../../../../selectors/kycController');
jest.mock('../../Ramp/Views/VirtualBankAccount/hooks/useVbaEligibility');
jest.mock('../../Ramp/Views/VirtualBankAccount/vbaVendorTermsStorage');
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseVbaEligibility = jest.mocked(useVbaEligibility);
const mockSelectSelectedVbaWalletAddress = jest.mocked(
  selectSelectedVbaWalletAddress,
);
const mockSelectRampsControllerState = jest.mocked(selectRampsControllerState);
const mockSelectKycSessionStatus = jest.mocked(selectKycSessionStatus);
const mockSelectKycProviderFlowStatus = jest.mocked(
  selectKycProviderFlowStatus,
);
const mockHasAcceptedVbaVendorTerms = jest.mocked(hasAcceptedVbaVendorTerms);
const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
  typeof useFocusEffect
>;
const mockHydrateVbaOnboarding = jest.mocked(
  Engine.context.RampsController.hydrateVbaOnboarding,
);

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

  it('renders no card when a usable autoramp exists for the wallet (decision rule 2)', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      autoramps: [makeAutoramp({ status: AutorampStatus.Created })],
    });

    expect(card).toEqual({ type: 'none' });
  });

  it('renders no card for an approved session while the autoramp is usable (rule 2 beats rule 4)', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      sessionStatus: makeSession({
        finalStatus: 'approved',
        kycStatus: 'approved',
      }),
      autoramps: [makeAutoramp()],
    });

    expect(card).toEqual({ type: 'none' });
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

  it('renders account_is_ready when finalStatus is approved and no usable autoramp exists (decision rule 4)', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      sessionStatus: makeSession({
        finalStatus: 'approved',
        kycStatus: 'pending',
      }),
    });

    expect(card).toEqual({ type: 'account_is_ready' });
  });

  it('renders account_is_ready when only kycStatus is approved (relay approval counts)', () => {
    const card = getVbaHomeCard({
      ...baseInputs,
      sessionStatus: makeSession({
        finalStatus: 'pending',
        kycStatus: 'approved',
      }),
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

  it('renders kyc_pending when finalStatus is pending (decision rule 6)', () => {
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
    // 3-7 all fail. Reinstall discovery is a follow-up.
    const card = getVbaHomeCard({
      ...baseInputs,
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
  }: {
    eligibility?: Partial<VbaEligibility>;
    walletAddress?: string | null;
    sessionStatus?: KycSessionStatus | null;
    providerFlowStatus?: KycProviderFlowStatus;
    autoramps?: AutorampAccount[];
    walletRegistrations?: MoneyAccountWalletRegistration[];
  } = {}) => {
    mockUseVbaEligibility.mockReturnValue(makeEligibility(eligibility));
    mockSelectSelectedVbaWalletAddress.mockReturnValue(walletAddress);
    mockSelectKycSessionStatus.mockReturnValue(sessionStatus);
    mockSelectKycProviderFlowStatus.mockReturnValue(providerFlowStatus);
    mockSelectRampsControllerState.mockReturnValue({
      autoramps,
      moneyAccountWalletRegistrations: walletRegistrations,
    } as RampsControllerState);
    mockHasAcceptedVbaVendorTerms.mockResolvedValue(false);
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
  let focusCallback: () => undefined | (() => void);

  const setupRefreshSelectors = ({
    walletAddress = WALLET,
    sessionStatus = null,
  }: {
    walletAddress?: string | null;
    sessionStatus?: KycSessionStatus | null;
  } = {}) => {
    mockSelectSelectedVbaWalletAddress.mockReturnValue(walletAddress);
    mockSelectKycSessionStatus.mockReturnValue(sessionStatus);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) =>
      selector(undefined as never),
    );
    mockUseFocusEffect.mockImplementation((callback) => {
      focusCallback = callback as typeof focusCallback;
    });
    mockHydrateVbaOnboarding.mockResolvedValue({} as VbaOnboardingSnapshot);
  });

  it('does not hydrate during initial render before focus', () => {
    setupRefreshSelectors({ sessionStatus: makeSession() });

    renderHook(() => useVbaHomeCardRefresh());

    expect(mockHydrateVbaOnboarding).not.toHaveBeenCalled();
  });

  it('starts a one-shot KYC refresh on focus for a non-terminal session', () => {
    setupRefreshSelectors({ sessionStatus: makeSession() });

    renderHook(() => useVbaHomeCardRefresh());
    focusCallback();

    expect(mockHydrateVbaOnboarding).toHaveBeenCalledTimes(1);
    expect(mockHydrateVbaOnboarding).toHaveBeenCalledWith({
      walletAddress: WALLET,
      refreshKyc: true,
    });
  });

  it('does not hydrate when there is no session', () => {
    setupRefreshSelectors({ sessionStatus: null });

    renderHook(() => useVbaHomeCardRefresh());
    focusCallback();

    expect(mockHydrateVbaOnboarding).not.toHaveBeenCalled();
  });

  it.each(['approved', 'rejected', 'retry'])(
    'does not hydrate for a terminal session (%s)',
    (finalStatus) => {
      setupRefreshSelectors({
        sessionStatus: makeSession({ finalStatus }),
      });

      renderHook(() => useVbaHomeCardRefresh());
      focusCallback();

      expect(mockHydrateVbaOnboarding).not.toHaveBeenCalled();
    },
  );

  it('does not hydrate without a selected wallet', () => {
    setupRefreshSelectors({
      sessionStatus: makeSession(),
      walletAddress: null,
    });

    renderHook(() => useVbaHomeCardRefresh());
    focusCallback();

    expect(mockHydrateVbaOnboarding).not.toHaveBeenCalled();
  });

  it('starts no polling loop after the one-shot refresh', () => {
    jest.useFakeTimers();
    try {
      setupRefreshSelectors({ sessionStatus: makeSession() });

      renderHook(() => useVbaHomeCardRefresh());
      focusCallback();
      // Outlive the KYC 15s poll cadence.
      jest.advanceTimersByTime(45_000);

      expect(mockHydrateVbaOnboarding).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('logs and swallows a failed refresh', async () => {
    const errorSpy = jest
      .spyOn(Logger, 'error')
      .mockImplementation(() => undefined);
    const failure = new Error('hydrate failed');
    mockHydrateVbaOnboarding.mockRejectedValue(failure);
    setupRefreshSelectors({ sessionStatus: makeSession() });

    renderHook(() => useVbaHomeCardRefresh());
    await act(async () => {
      focusCallback();
    });

    expect(errorSpy).toHaveBeenCalledWith(
      failure,
      expect.objectContaining({
        context: expect.objectContaining({ name: 'useVbaHomeCardRefresh' }),
      }),
    );
    errorSpy.mockRestore();
  });
});
