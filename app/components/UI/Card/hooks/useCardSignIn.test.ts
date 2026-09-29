import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useCardSignIn } from './useCardSignIn';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { CardProviderIds } from '../../../../core/Engine/controllers/card-controller/provider-types';

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn().mockReturnValue({ event: 'built' });
const mockAddProperties = jest.fn().mockReturnValue({ build: mockBuild });
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: mockAddProperties,
});

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockResumeImmersveOnboarding = jest.fn();
jest.mock('./useImmersveResumeOnboarding', () => ({
  useImmersveResumeOnboarding: () => mockResumeImmersveOnboarding,
}));

const mockResolveSignIn = jest.fn();
const mockVerifyAccountForSignIn = jest.fn();
const mockAuthenticateWithWallet = jest.fn();
const mockSelectSignInOption = jest.fn();
const mockGetSignInOptions = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      CardController: {
        resolveSignIn: (...args: unknown[]) => mockResolveSignIn(...args),
        verifyAccountForSignIn: (...args: unknown[]) =>
          mockVerifyAccountForSignIn(...args),
        authenticateWithWallet: (...args: unknown[]) =>
          mockAuthenticateWithWallet(...args),
        selectSignInOption: (...args: unknown[]) =>
          mockSelectSignInOption(...args),
        getSignInOptions: (...args: unknown[]) => mockGetSignInOptions(...args),
      },
    },
  },
}));

const SELECTED = '0x1111111111111111111111111111111111111111';
const GROUP_2 = '0x2222222222222222222222222222222222222222';
const GROUP_3 = '0x3333333333333333333333333333333333333333';
const EXTRA = '0x4444444444444444444444444444444444444444';

let mockSelectedSignInAddress = '0x1111111111111111111111111111111111111111';

jest.mock('react-redux', () => {
  const selected = '0x1111111111111111111111111111111111111111';
  const group2 = '0x2222222222222222222222222222222222222222';
  const group3 = '0x3333333333333333333333333333333333333333';
  const extra = '0x4444444444444444444444444444444444444444';

  const state = {
    evmAccounts: [
      { address: selected },
      { address: group2 },
      { address: group3 },
      { address: extra },
    ],
    accountGroups: [{ id: 'group-1' }, { id: 'group-2' }],
    get selectedAccount() {
      return { address: mockSelectedSignInAddress, type: 'eip155:eoa' };
    },
    accountsByGroupId: (groupId: string) => {
      if (groupId === 'group-1') {
        return [
          { address: selected, type: 'eip155:eoa' },
          { address: group2, type: 'eip155:eoa' },
        ];
      }
      return [{ address: group3, type: 'eip155:eoa' }];
    },
  };

  return {
    useSelector: (selector: (s: typeof state) => unknown) => selector(state),
  };
});

jest.mock('../../../../selectors/accountsController', () => ({
  selectInternalEvmAccounts: (state: { evmAccounts: { address: string }[] }) =>
    state.evmAccounts,
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectAccountGroups: (state: { accountGroups: { id: string }[] }) =>
      state.accountGroups,
  }),
);

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope:
    (state: { selectedAccount: { address: string; type: string } }) => () =>
      state.selectedAccount,
  selectInternalAccountsByGroupId: (state: {
    accountsByGroupId: (groupId: string) => {
      address: string;
      type: string;
    }[];
  }) => state.accountsByGroupId,
}));

describe('useCardSignIn', () => {
  const walletOption = {
    providerId: CardProviderIds.Immersve,
    method: 'siwe' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedSignInAddress = SELECTED;
    mockResolveSignIn.mockResolvedValue({
      kind: 'email',
      option: {
        providerId: CardProviderIds.Baanx,
        method: 'email_password',
      },
    });
    mockAuthenticateWithWallet.mockResolvedValue({ done: true });
    mockResumeImmersveOnboarding.mockResolvedValue(undefined);
  });

  it('resolves with the selected account first, then the next two by group order', async () => {
    const { result } = renderHook(() => useCardSignIn('GB'));

    await waitFor(() => {
      expect(result.current.resolution?.kind).toBe('email');
    });

    expect(mockResolveSignIn).toHaveBeenCalledWith({
      country: 'GB',
      candidateAddresses: [SELECTED, GROUP_2, GROUP_3],
      deviceAddresses: [SELECTED, GROUP_2, GROUP_3, EXTRA],
    });
    expect(mockResolveSignIn).toHaveBeenCalledTimes(1);
  });

  it('fires CARD_SIGN_IN_RESOLVED without addresses', async () => {
    mockResolveSignIn.mockResolvedValue({
      kind: 'wallet',
      option: walletOption,
      address: SELECTED,
      source: 'lookup',
    });

    const { result } = renderHook(() => useCardSignIn('GB'));

    await waitFor(() => {
      expect(result.current.resolution?.kind).toBe('wallet');
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_SIGN_IN_RESOLVED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'wallet',
        source: 'lookup',
        addresses_checked: 3,
        duration_ms: expect.any(Number),
      }),
    );
    expect(mockAddProperties.mock.calls[0][0]).not.toHaveProperty('address');
  });

  it('signInWithWallet authenticates then resumes Immersve onboarding', async () => {
    const { result } = renderHook(() => useCardSignIn('GB'));
    await waitFor(() => {
      expect(result.current.resolution).not.toBeNull();
    });

    await act(async () => {
      await result.current.signInWithWallet({
        option: walletOption,
        address: SELECTED,
        country: 'GB',
      });
    });

    expect(mockAuthenticateWithWallet).toHaveBeenCalledWith({
      option: walletOption,
      address: SELECTED,
      country: 'GB',
      autoSignup: false,
    });
    expect(mockResumeImmersveOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({
        alreadyAuthenticated: true,
        address: SELECTED,
        country: 'GB',
      }),
    );
  });

  it('retry re-runs resolveSignIn', async () => {
    const { result } = renderHook(() => useCardSignIn('GB'));
    await waitFor(() => {
      expect(result.current.resolution).not.toBeNull();
    });
    expect(mockResolveSignIn).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(mockResolveSignIn).toHaveBeenCalledTimes(2);
    });
  });

  it('does not resolve again when only the selected account changes', async () => {
    const { result, rerender } = renderHook(() => useCardSignIn('GB'));
    await waitFor(() => {
      expect(result.current.resolution).not.toBeNull();
    });
    expect(mockResolveSignIn).toHaveBeenCalledTimes(1);

    mockSelectedSignInAddress = GROUP_2;
    rerender(undefined);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockResolveSignIn).toHaveBeenCalledTimes(1);
  });

  it('does not resolve when country is null', () => {
    const { result } = renderHook(() => useCardSignIn(null));
    expect(mockResolveSignIn).not.toHaveBeenCalled();
    expect(result.current.resolution).toBeNull();
  });
});
