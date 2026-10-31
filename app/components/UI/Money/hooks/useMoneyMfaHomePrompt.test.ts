import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { EnrolledCredential } from '@metamask/profile-sync-controller/sdk';
import Routes from '../../../../constants/navigation/Routes';
import { selectAccountGroupBalanceForEmptyState } from '../../../../selectors/assets/balances';
import { mobileMfaControllerAdapter } from '../../../../util/identity/mfa/bindings';
import { useMoneyMfa, type MoneyMfaStatus } from './useMoneyMfa';
import { moneyMfaStore } from '../../../../lib/Money/mfa/moneyMfaStore';
import { moneyMfaHomePromptSession } from '../../../../lib/Money/mfa/moneyMfaHomePromptSession';
import { useMoneyMfaHomePrompt } from './useMoneyMfaHomePrompt';

const mockNavigate = jest.fn();
let mockFocus: (() => (() => void) | void) | undefined;
let mockBlur: (() => void) | void;

jest.mock('../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    getItemSync: jest.fn(() => null),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (callback: () => (() => void) | void) => {
    mockFocus = callback;
    mockBlur = callback();
  },
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('./useMoneyMfa', () => ({
  useMoneyMfa: jest.fn(),
}));

jest.mock('../../../../util/identity/mfa/bindings', () => ({
  mobileMfaControllerAdapter: {
    refreshEnrolledCredentials: jest.fn(),
  },
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseMoneyMfa = jest.mocked(useMoneyMfa);
const mockRefreshEnrolledCredentials = jest.mocked(
  mobileMfaControllerAdapter.refreshEnrolledCredentials,
);

const activePasskey: EnrolledCredential = {
  id: 'passkey',
  type: 'passkey',
  status: 'active',
};

const flushPromises = () => act(async () => undefined);

const arrange = ({
  status = 'not_set_up',
  totalBalance = 10,
  hasBalance = true,
  credentials = [],
  refreshError,
  pendingCredentials,
}: {
  status?: MoneyMfaStatus;
  totalBalance?: number;
  hasBalance?: boolean;
  credentials?: EnrolledCredential[];
  refreshError?: Error;
  pendingCredentials?: Promise<EnrolledCredential[]>;
} = {}) => {
  mockUseMoneyMfa.mockReturnValue({
    status,
    turnOn: jest.fn(),
    addPasskeyAndTurnOn: jest.fn(),
    retry: jest.fn(),
    turnOff: jest.fn(),
    isSettingUpBannerDismissed: false,
    dismissSettingUpBanner: jest.fn(),
    refreshCredentials: jest.fn(),
  });
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectAccountGroupBalanceForEmptyState) {
      return hasBalance
        ? { totalBalanceInUserCurrency: totalBalance }
        : undefined;
    }
    return undefined;
  });
  if (pendingCredentials) {
    mockRefreshEnrolledCredentials.mockReturnValue(pendingCredentials);
  } else if (refreshError) {
    mockRefreshEnrolledCredentials.mockRejectedValue(refreshError);
  } else {
    mockRefreshEnrolledCredentials.mockResolvedValue(credentials);
  }
  return renderHook(() => useMoneyMfaHomePrompt());
};

describe('useMoneyMfaHomePrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    moneyMfaHomePromptSession.reset();
    moneyMfaStore.reset();
  });

  it('opens the passkey prompt when the funded wallet has no passkey', async () => {
    arrange();

    await flushPromises();

    expect(mockRefreshEnrolledCredentials).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.MFA_PROMPT_SHEET,
    });
  });

  it('opens the prompt when Wallet regains focus during the passkey check', async () => {
    let resolveCredentials: (credentials: EnrolledCredential[]) => void = () =>
      undefined;
    arrange({
      pendingCredentials: new Promise((resolve) => {
        resolveCredentials = resolve;
      }),
    });

    await act(async () => {
      mockBlur?.();
      mockBlur = mockFocus?.();
      resolveCredentials([]);
    });
    await flushPromises();

    expect(mockRefreshEnrolledCredentials).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('opens the prompt once per session', async () => {
    arrange().unmount();
    await flushPromises();

    arrange();
    await flushPromises();

    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('skips the prompt when the refreshed credentials include an active passkey', async () => {
    arrange({ credentials: [activePasskey] });

    await flushPromises();

    expect(mockRefreshEnrolledCredentials).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens the prompt when the refreshed passkey is still pending', async () => {
    arrange({
      credentials: [{ id: 'passkey', type: 'passkey', status: 'pending' }],
    });

    await flushPromises();

    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('skips the prompt when refreshing credentials rejects', async () => {
    arrange({ refreshError: new Error('offline') });

    await flushPromises();

    expect(mockRefreshEnrolledCredentials).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it.each<MoneyMfaStatus>([
    'unavailable',
    'setting_up',
    'failed',
    'enabled',
    'off',
  ])('does nothing when the status is %s', async (status) => {
    arrange({ status });

    await flushPromises();

    expect(mockRefreshEnrolledCredentials).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does nothing when the wallet balance is zero', async () => {
    arrange({ totalBalance: 0 });

    await flushPromises();

    expect(mockRefreshEnrolledCredentials).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does nothing when the wallet balance is unknown', async () => {
    arrange({ hasBalance: false });

    await flushPromises();

    expect(mockRefreshEnrolledCredentials).not.toHaveBeenCalled();
  });

  it('does nothing when the prompt was already dismissed', async () => {
    moneyMfaStore.setState({ isHomePromptDismissed: true });
    arrange();

    await flushPromises();

    expect(mockRefreshEnrolledCredentials).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
