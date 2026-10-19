import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { EnrolledCredential } from '@metamask/profile-sync-controller/sdk';
import Routes from '../../../../constants/navigation/Routes';
import { isMfaKitEnabled, useMfa } from '../../../../util/identity/mfa';
import { mobileMfaControllerAdapter } from '../../../../util/identity/mfa/bindings';
import { useMoneyMfa } from './useMoneyMfa';
import { moneyMfaStore } from './moneyMfaStore';
import { createMfaMoneyAccount } from './createMfaMoneyAccount';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../util/identity/mfa', () => ({
  useMfa: jest.fn(),
  isMfaKitEnabled: jest.fn(),
}));

jest.mock('../../../../util/identity/mfa/bindings', () => ({
  mobileMfaControllerAdapter: {
    refreshEnrolledCredentials: jest.fn(),
  },
}));

const mockNavigate = jest.fn();
jest.mock('../../../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      navigate: (...args: unknown[]) => mockNavigate(...args),
    },
  },
}));

jest.mock('./createMfaMoneyAccount', () => ({
  createMfaMoneyAccount: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseMfa = jest.mocked(useMfa);
const mockIsMfaKitEnabled = jest.mocked(isMfaKitEnabled);
const mockCreateMfaMoneyAccount = jest.mocked(createMfaMoneyAccount);
const mockRefreshEnrolledCredentials = jest.mocked(
  mobileMfaControllerAdapter.refreshEnrolledCredentials,
);

const mockEnroll = jest.fn();
const mockVerifyOrEnroll = jest.fn();

const activePasskey: EnrolledCredential = {
  type: 'passkey',
  status: 'active',
};

const activeEmail = {
  type: 'email_otp',
  status: 'active',
} as EnrolledCredential;

const arrange = ({
  isFlagEnabled = true,
  isKitEnabled = true,
  credentials = [],
}: {
  isFlagEnabled?: boolean;
  isKitEnabled?: boolean;
  credentials?: EnrolledCredential[];
} = {}) => {
  mockUseSelector.mockReturnValue(isFlagEnabled);
  mockIsMfaKitEnabled.mockReturnValue(isKitEnabled);
  mockUseMfa.mockReturnValue({
    credentials,
    enroll: mockEnroll,
    verifyOrEnroll: mockVerifyOrEnroll,
  } as unknown as ReturnType<typeof useMfa>);
  return renderHook(() => useMoneyMfa());
};

const expectEnabledSheetShown = () =>
  expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
    screen: Routes.MONEY.MODALS.MFA_ENABLED_SHEET,
  });

describe('useMoneyMfa', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    moneyMfaStore.reset();
    mockEnroll.mockResolvedValue({});
    mockVerifyOrEnroll.mockResolvedValue({});
    mockCreateMfaMoneyAccount.mockResolvedValue(undefined);
    mockRefreshEnrolledCredentials.mockResolvedValue([]);
  });

  describe('status', () => {
    it('returns unavailable when the Money MFA flag is off', () => {
      const { result } = arrange({ isFlagEnabled: false });

      expect(result.current.status).toBe('unavailable');
    });

    it('returns unavailable when the MFA kit is disabled', () => {
      const { result } = arrange({ isKitEnabled: false });

      expect(result.current.status).toBe('unavailable');
    });

    it('returns unavailable over a setting_up phase when the flag is off', () => {
      moneyMfaStore.setState({ phase: 'setting_up' });

      const { result } = arrange({ isFlagEnabled: false });

      expect(result.current.status).toBe('unavailable');
    });

    it('returns not_set_up when there is no passkey', () => {
      const { result } = arrange();

      expect(result.current.status).toBe('not_set_up');
    });

    it('returns not_set_up when the only passkey is not active', () => {
      const { result } = arrange({
        credentials: [{ type: 'passkey', status: 'pending' }],
      });

      expect(result.current.status).toBe('not_set_up');
    });

    it('returns not_set_up when only an email credential is active', () => {
      const { result } = arrange({
        credentials: [{ type: 'email_otp', status: 'active', verified: true }],
      });

      expect(result.current.status).toBe('not_set_up');
    });

    it('returns enabled when an active passkey exists', () => {
      const { result } = arrange({ credentials: [activePasskey] });

      expect(result.current.status).toBe('enabled');
    });

    it('returns off when an active passkey exists and 2FA was turned off', () => {
      moneyMfaStore.setState({ isTurnedOff: true });

      const { result } = arrange({ credentials: [activePasskey] });

      expect(result.current.status).toBe('off');
    });

    it('returns setting_up while the Money account is being created', () => {
      moneyMfaStore.setState({ phase: 'setting_up' });

      const { result } = arrange({ credentials: [activePasskey] });

      expect(result.current.status).toBe('setting_up');
    });

    it('returns failed after the Money account creation failed', () => {
      moneyMfaStore.setState({ phase: 'failed' });

      const { result } = arrange({ credentials: [activePasskey] });

      expect(result.current.status).toBe('failed');
    });

    it('updates when the store changes after render', () => {
      const { result } = arrange({ credentials: [activePasskey] });

      act(() => {
        moneyMfaStore.setState({ isTurnedOff: true });
      });

      expect(result.current.status).toBe('off');
    });
  });

  describe('turnOn', () => {
    it('enrolls a passkey when none exists', async () => {
      const { result } = arrange();

      await act(async () => {
        await result.current.turnOn();
      });

      expect(mockEnroll).toHaveBeenCalledWith({
        method: 'passkey',
        reason: expect.objectContaining({ operation: 'money.mfa.setup' }),
      });
      expect(mockVerifyOrEnroll).not.toHaveBeenCalled();
    });

    it('creates the Money account and shows the enabled sheet after enrolling', async () => {
      const { result } = arrange();

      await act(async () => {
        await result.current.turnOn();
      });

      expect(mockCreateMfaMoneyAccount).toHaveBeenCalledTimes(1);
      expect(moneyMfaStore.getState()).toEqual({
        phase: 'idle',
        isTurnedOff: false,
      });
      expectEnabledSheetShown();
    });

    it('sets the phase to setting_up while the Money account is created', async () => {
      let resolveCreate: () => void = () => undefined;
      mockCreateMfaMoneyAccount.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveCreate = resolve;
        }),
      );
      const { result } = arrange();

      let turnOnPromise: Promise<void> = Promise.resolve();
      await act(async () => {
        turnOnPromise = result.current.turnOn();
        await Promise.resolve();
      });

      expect(moneyMfaStore.getState().phase).toBe('setting_up');
      expect(result.current.status).toBe('setting_up');

      await act(async () => {
        resolveCreate();
        await turnOnPromise;
      });
    });

    it('sets the phase to failed when the Money account creation rejects', async () => {
      mockCreateMfaMoneyAccount.mockRejectedValue(new Error('create failed'));
      const { result } = arrange();

      await act(async () => {
        await result.current.turnOn();
      });

      expect(moneyMfaStore.getState().phase).toBe('failed');
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('verifies with the existing passkey instead of enrolling', async () => {
      const { result } = arrange({ credentials: [activePasskey] });

      await act(async () => {
        await result.current.turnOn();
      });

      expect(mockVerifyOrEnroll).toHaveBeenCalledWith({
        methods: ['passkey'],
        verifyWith: ['passkey'],
        maxSessionAgeMs: 0,
        reason: expect.objectContaining({ operation: 'money.mfa.setup' }),
      });
      expect(mockEnroll).not.toHaveBeenCalled();
    });

    it('turns 2FA back on and shows the enabled sheet without creating an account when a passkey exists', async () => {
      moneyMfaStore.setState({ isTurnedOff: true });
      const { result } = arrange({ credentials: [activePasskey] });

      await act(async () => {
        await result.current.turnOn();
      });

      expect(moneyMfaStore.getState().isTurnedOff).toBe(false);
      expect(mockCreateMfaMoneyAccount).not.toHaveBeenCalled();
      expectEnabledSheetShown();
    });

    it('leaves state unchanged when the kit rejects enrollment', async () => {
      mockEnroll.mockRejectedValue(new Error('flow_cancelled'));
      const { result } = arrange();

      await act(async () => {
        await result.current.turnOn();
      });

      expect(mockCreateMfaMoneyAccount).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(moneyMfaStore.getState()).toEqual({
        phase: 'idle',
        isTurnedOff: false,
      });
    });

    it('leaves 2FA turned off when the kit rejects verification', async () => {
      mockVerifyOrEnroll.mockRejectedValue(new Error('flow_cancelled'));
      moneyMfaStore.setState({ isTurnedOff: true });
      const { result } = arrange({ credentials: [activePasskey] });

      await act(async () => {
        await result.current.turnOn();
      });

      expect(moneyMfaStore.getState().isTurnedOff).toBe(true);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does nothing while the Money account is already being set up', async () => {
      moneyMfaStore.setState({ phase: 'setting_up' });
      const { result } = arrange();

      await act(async () => {
        await result.current.turnOn();
      });

      expect(mockEnroll).not.toHaveBeenCalled();
      expect(mockVerifyOrEnroll).not.toHaveBeenCalled();
    });
  });

  describe('retry', () => {
    it('re-runs the Money account creation and shows the enabled sheet', async () => {
      moneyMfaStore.setState({ phase: 'failed' });
      const { result } = arrange();

      await act(async () => {
        await result.current.retry();
      });

      expect(mockCreateMfaMoneyAccount).toHaveBeenCalledTimes(1);
      expect(mockEnroll).not.toHaveBeenCalled();
      expect(moneyMfaStore.getState().phase).toBe('idle');
      expectEnabledSheetShown();
    });

    it('sets the phase back to failed when the retry rejects', async () => {
      mockCreateMfaMoneyAccount.mockRejectedValue(new Error('create failed'));
      moneyMfaStore.setState({ phase: 'failed' });
      const { result } = arrange();

      await act(async () => {
        await result.current.retry();
      });

      expect(moneyMfaStore.getState().phase).toBe('failed');
    });
  });

  describe('turnOff', () => {
    it('verifies with a fresh passkey check, then marks 2FA as turned off', async () => {
      const { result } = arrange({ credentials: [activePasskey] });

      await act(async () => {
        await result.current.turnOff();
      });

      expect(mockVerifyOrEnroll).toHaveBeenCalledWith({
        methods: ['passkey'],
        verifyWith: ['passkey'],
        maxSessionAgeMs: 0,
        reason: expect.objectContaining({ operation: 'money.mfa.turnOff' }),
      });
      expect(moneyMfaStore.getState().isTurnedOff).toBe(true);
      expect(result.current.status).toBe('off');
    });

    it('offers every active method when email is also set up', async () => {
      const { result } = arrange({ credentials: [activePasskey, activeEmail] });

      await act(async () => {
        await result.current.turnOff();
      });

      expect(mockVerifyOrEnroll).toHaveBeenCalledWith(
        expect.objectContaining({
          methods: ['passkey', 'email_otp'],
          verifyWith: ['passkey', 'email_otp'],
        }),
      );
    });

    it('keeps 2FA on when verification is rejected', async () => {
      mockVerifyOrEnroll.mockRejectedValue(new Error('flow_cancelled'));
      const { result } = arrange({ credentials: [activePasskey] });

      await act(async () => {
        await result.current.turnOff();
      });

      expect(moneyMfaStore.getState().isTurnedOff).toBe(false);
      expect(result.current.status).toBe('enabled');
    });
  });

  describe('dismissFailure', () => {
    it('sets the phase back to idle', () => {
      moneyMfaStore.setState({ phase: 'failed' });
      const { result } = arrange();

      act(() => {
        result.current.dismissFailure();
      });

      expect(moneyMfaStore.getState().phase).toBe('idle');
      expect(result.current.status).toBe('not_set_up');
    });
  });

  describe('refreshCredentials', () => {
    it('refreshes the enrolled credentials when MFA is available', () => {
      const { result } = arrange();

      result.current.refreshCredentials();

      expect(mockRefreshEnrolledCredentials).toHaveBeenCalledTimes(1);
    });

    it('skips the refresh when MFA is unavailable', () => {
      const { result } = arrange({ isFlagEnabled: false });

      result.current.refreshCredentials();

      expect(mockRefreshEnrolledCredentials).not.toHaveBeenCalled();
    });
  });
});
