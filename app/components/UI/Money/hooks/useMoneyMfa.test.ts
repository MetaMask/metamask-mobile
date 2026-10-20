import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { EnrolledCredential } from '@metamask/profile-sync-controller/sdk';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { ToastContext } from '../../../../component-library/components/Toast';
import { isMfaKitEnabled, useMfa } from '../../../../util/identity/mfa';
import { mobileMfaControllerAdapter } from '../../../../util/identity/mfa/bindings';
import { useMoneyMfa } from './useMoneyMfa';
import { moneyMfaStore } from './moneyMfaStore';
import { createMfaMoneyAccount } from './createMfaMoneyAccount';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    getItemSync: jest.fn(() => null),
    setItem: jest.fn(() => Promise.resolve()),
  },
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
const mockShowToast = jest.fn();

const activePasskey: EnrolledCredential = {
  type: 'passkey',
  status: 'active',
};

const activeEmail = {
  type: 'email_otp',
  status: 'active',
} as EnrolledCredential;

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    ToastContext.Provider,
    {
      value: {
        toastRef: {
          current: { showToast: mockShowToast, closeToast: jest.fn() },
        },
      },
    },
    children,
  );

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
  return renderHook(() => useMoneyMfa(), { wrapper });
};

const expectEnabledSheetShown = () =>
  expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
    screen: Routes.MONEY.MODALS.MFA_ENABLED_SHEET,
  });

const expectToast = (labelKey: string) =>
  expect(mockShowToast).toHaveBeenCalledWith(
    expect.objectContaining({
      labelOptions: [{ label: strings(labelKey) }],
    }),
  );

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

    it('returns not_set_up when 2FA was never turned on, even with both methods', () => {
      const { result } = arrange({ credentials: [activePasskey, activeEmail] });

      expect(result.current.status).toBe('not_set_up');
    });

    it('returns enabled when 2FA is on', () => {
      moneyMfaStore.setState({ isEnabled: true, hasBeenEnabled: true });

      const { result } = arrange();

      expect(result.current.status).toBe('enabled');
    });

    it('returns off when 2FA was turned on before and is now off', () => {
      moneyMfaStore.setState({ isEnabled: false, hasBeenEnabled: true });

      const { result } = arrange();

      expect(result.current.status).toBe('off');
    });

    it.each(['setting_up', 'failed'] as const)(
      'returns %s from the setup phase',
      (phase) => {
        moneyMfaStore.setState({ phase });

        const { result } = arrange();

        expect(result.current.status).toBe(phase);
      },
    );

    it('updates when the store changes after render', () => {
      const { result } = arrange();

      act(() => {
        moneyMfaStore.setState({ isEnabled: true, hasBeenEnabled: true });
      });

      expect(result.current.status).toBe('enabled');
    });
  });

  describe('turnOn', () => {
    it('asks the kit to verify or set up passkey and email with a fresh check', async () => {
      const { result } = arrange();

      await act(async () => {
        await result.current.turnOn();
      });

      expect(mockVerifyOrEnroll).toHaveBeenCalledWith({
        methods: ['passkey', 'email_otp'],
        verifyWith: ['passkey', 'email_otp'],
        maxSessionAgeMs: 0,
        reason: expect.objectContaining({ operation: 'money.mfa.setup' }),
      });
    });

    it('creates the Money account and shows the enabled sheet on first setup', async () => {
      const { result } = arrange();

      await act(async () => {
        await result.current.turnOn();
      });

      expect(mockCreateMfaMoneyAccount).toHaveBeenCalledTimes(1);
      expect(moneyMfaStore.getState()).toEqual({
        phase: 'idle',
        isEnabled: true,
        hasBeenEnabled: true,
      });
      expectEnabledSheetShown();
      expect(mockShowToast).not.toHaveBeenCalled();
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
        await Promise.resolve();
      });

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

      expect(moneyMfaStore.getState()).toEqual({
        phase: 'failed',
        isEnabled: false,
        hasBeenEnabled: false,
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('turns 2FA back on with a toast and no new account when it was on before', async () => {
      moneyMfaStore.setState({ hasBeenEnabled: true });
      const { result } = arrange({ credentials: [activePasskey, activeEmail] });

      await act(async () => {
        await result.current.turnOn();
      });

      expect(moneyMfaStore.getState().isEnabled).toBe(true);
      expect(mockCreateMfaMoneyAccount).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expectToast('money.mfa.toast_on');
    });

    it('leaves state unchanged when the kit is cancelled', async () => {
      mockVerifyOrEnroll.mockRejectedValue(new Error('flow_cancelled'));
      const { result } = arrange();

      await act(async () => {
        await result.current.turnOn();
      });

      expect(mockCreateMfaMoneyAccount).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(result.current.status).toBe('not_set_up');
    });

    it('does nothing while the Money account is already being set up', async () => {
      moneyMfaStore.setState({ phase: 'setting_up' });
      const { result } = arrange();

      await act(async () => {
        await result.current.turnOn();
      });

      expect(mockVerifyOrEnroll).not.toHaveBeenCalled();
    });
  });

  describe('addPasskeyAndTurnOn', () => {
    it('adds a passkey first when none is active', async () => {
      const { result } = arrange();

      await act(async () => {
        await result.current.addPasskeyAndTurnOn();
      });

      expect(mockEnroll).toHaveBeenCalledWith({
        method: 'passkey',
        reason: expect.objectContaining({ operation: 'money.mfa.setup' }),
      });
      expect(mockVerifyOrEnroll).toHaveBeenCalledTimes(1);
    });

    it('skips adding a passkey when one is active', async () => {
      const { result } = arrange({ credentials: [activePasskey] });

      await act(async () => {
        await result.current.addPasskeyAndTurnOn();
      });

      expect(mockEnroll).not.toHaveBeenCalled();
      expect(mockVerifyOrEnroll).toHaveBeenCalledTimes(1);
    });

    it('stops when adding the passkey is cancelled', async () => {
      mockEnroll.mockRejectedValue(new Error('flow_cancelled'));
      const { result } = arrange();

      await act(async () => {
        await result.current.addPasskeyAndTurnOn();
      });

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
      expect(mockVerifyOrEnroll).not.toHaveBeenCalled();
      expect(result.current.status).toBe('enabled');
      expectEnabledSheetShown();
    });

    it('sets the phase back to failed when the retry rejects', async () => {
      mockCreateMfaMoneyAccount.mockRejectedValue(new Error('create failed'));
      moneyMfaStore.setState({ phase: 'failed' });
      const { result } = arrange();

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.status).toBe('failed');
    });
  });

  describe('turnOff', () => {
    beforeEach(() => {
      moneyMfaStore.setState({ isEnabled: true, hasBeenEnabled: true });
    });

    it('verifies with every active method, turns 2FA off and shows a toast', async () => {
      const { result } = arrange({ credentials: [activePasskey, activeEmail] });

      await act(async () => {
        await result.current.turnOff();
      });

      expect(mockVerifyOrEnroll).toHaveBeenCalledWith({
        methods: ['passkey', 'email_otp'],
        verifyWith: ['passkey', 'email_otp'],
        maxSessionAgeMs: 0,
        reason: expect.objectContaining({ operation: 'money.mfa.turnOff' }),
      });
      expect(result.current.status).toBe('off');
      expectToast('money.mfa.toast_off');
    });

    it('keeps 2FA on when verification is cancelled', async () => {
      mockVerifyOrEnroll.mockRejectedValue(new Error('flow_cancelled'));
      const { result } = arrange({ credentials: [activePasskey] });

      await act(async () => {
        await result.current.turnOff();
      });

      expect(result.current.status).toBe('enabled');
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('dismissFailure', () => {
    it('sets the phase back to idle', () => {
      moneyMfaStore.setState({ phase: 'failed' });
      const { result } = arrange();

      act(() => {
        result.current.dismissFailure();
      });

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
