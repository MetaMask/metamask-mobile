import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { EnrolledCredential } from '@metamask/profile-sync-controller/sdk';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { ToastContext } from '../../../../component-library/components/Toast';
import { useMfa } from '../../../../util/identity/mfa';
import { selectMoneyEnableMfaFlag } from '../selectors/featureFlags';
import { selectMfaUiKitEnabled } from '../../../../selectors/featureFlagController/mfaUiKit';
import { isMpcMoneyKeyringBuildEnabled } from '../../../../constants/featureFlags';
import { mobileMfaControllerAdapter } from '../../../../util/identity/mfa/bindings';
import { useMoneyMfa } from './useMoneyMfa';
import { moneyMfaStore } from '../../../../lib/Money/mfa/moneyMfaStore';
import {
  moneyAccountMigration,
  type MoneyAccountMigrationStatus,
} from '../../../../lib/Money/mfa/moneyAccountMigration';

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
}));

jest.mock('../../../../constants/featureFlags', () => ({
  isMpcMoneyKeyringBuildEnabled: jest.fn(),
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

jest.mock('../../../../lib/Money/mfa/moneyAccountMigration', () => {
  let status = 'not_started';
  const listeners = new Set<() => void>();
  const setStatus = (next: string) => {
    status = next;
    listeners.forEach((listener) => listener());
  };
  return {
    moneyAccountMigration: {
      getStatus: () => status,
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      start: jest.fn(),
      reset: () => setStatus('not_started'),
      setStatusForTest: setStatus,
    },
  };
});

const mockUseSelector = jest.mocked(useSelector);
const mockUseMfa = jest.mocked(useMfa);
const mockIsMpcKeyringEnabled = jest.mocked(isMpcMoneyKeyringBuildEnabled);
const mockStart = jest.mocked(moneyAccountMigration.start);
const setMigration = (status: MoneyAccountMigrationStatus) =>
  act(() => {
    (
      moneyAccountMigration as unknown as {
        setStatusForTest: (next: MoneyAccountMigrationStatus) => void;
      }
    ).setStatusForTest(status);
  });

// Resolves the migration on demand, like the real one finishing.
const deferMigration = () => {
  let finish: (ok: boolean) => void = () => undefined;
  mockStart.mockImplementation(
    () =>
      new Promise<void>((resolve, reject) => {
        setMigration('migrating');
        finish = (ok) => {
          setMigration(ok ? 'done' : 'failed');
          if (ok) resolve();
          else reject(new Error('migration failed'));
        };
      }),
  );
  return (ok: boolean) => finish(ok);
};
const mockRefreshEnrolledCredentials = jest.mocked(
  mobileMfaControllerAdapter.refreshEnrolledCredentials,
);

const mockEnroll = jest.fn();
const mockVerifyOrEnroll = jest.fn();
const mockShowToast = jest.fn();

const activePasskey: EnrolledCredential = {
  id: 'passkey',
  type: 'passkey',
  status: 'active',
};

const activeTotp: EnrolledCredential = {
  id: 'totp',
  type: 'totp',
  status: 'active',
};

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
  isMpcKeyringEnabled = true,
  credentials = [],
}: {
  isFlagEnabled?: boolean;
  isKitEnabled?: boolean;
  isMpcKeyringEnabled?: boolean;
  credentials?: EnrolledCredential[];
} = {}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectMoneyEnableMfaFlag) return isFlagEnabled;
    if (selector === selectMfaUiKitEnabled) return isKitEnabled;
    return undefined;
  });
  mockIsMpcKeyringEnabled.mockReturnValue(isMpcKeyringEnabled);
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
    moneyAccountMigration.reset();
    mockEnroll.mockResolvedValue({});
    mockVerifyOrEnroll.mockResolvedValue({});
    mockStart.mockImplementation(async () => {
      setMigration('migrating');
      setMigration('done');
    });
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

    it('returns unavailable when the build has no MPC Money keyring', () => {
      const { result } = arrange({ isMpcKeyringEnabled: false });

      expect(result.current.status).toBe('unavailable');
    });

    it('returns not_set_up when 2FA was never turned on, even with both methods', () => {
      const { result } = arrange({ credentials: [activePasskey, activeTotp] });

      expect(result.current.status).toBe('not_set_up');
    });

    it('returns enabled when 2FA is on', () => {
      setMigration('done');
      moneyMfaStore.setState({ isMoneyAccountMfaEnabled: true });

      const { result } = arrange();

      expect(result.current.status).toBe('enabled');
    });

    it('returns off when the migration is done and 2FA is off', () => {
      setMigration('done');

      const { result } = arrange();

      expect(result.current.status).toBe('off');
    });

    it('returns failed when the migration failed', () => {
      setMigration('failed');

      const { result } = arrange();

      expect(result.current.status).toBe('failed');
    });

    it('returns setting_up and resumes a migration that was interrupted', async () => {
      const finish = deferMigration();
      setMigration('migrating');

      const { result } = arrange();

      expect(result.current.status).toBe('setting_up');
      expect(mockStart).toHaveBeenCalledTimes(1);
      await act(async () => {
        finish(true);
      });
      expect(result.current.status).toBe('enabled');
      expectEnabledSheetShown();
    });

    it('does not resume while the flag is off', () => {
      setMigration('migrating');

      const { result } = arrange({ isFlagEnabled: false });

      expect(result.current.status).toBe('unavailable');
      expect(mockStart).not.toHaveBeenCalled();
    });
  });

  describe('turnOn', () => {
    it('asks the kit to verify or set up passkey and authenticator app with a fresh check', async () => {
      const { result } = arrange();

      await act(async () => {
        await result.current.turnOn();
      });

      expect(mockVerifyOrEnroll).toHaveBeenCalledWith({
        methods: ['passkey', 'totp'],
        verifyWith: ['passkey', 'totp'],
        maxSessionAgeMs: 0,
        reason: expect.objectContaining({ operation: 'money.mfa.setup' }),
      });
    });

    it('migrates, turns 2FA on and shows the enabled sheet on first setup', async () => {
      const { result } = arrange();

      await act(async () => {
        await result.current.turnOn();
      });

      expect(mockStart).toHaveBeenCalledTimes(1);
      expect(result.current.status).toBe('enabled');
      expect(moneyMfaStore.getState().isMoneyAccountMfaEnabled).toBe(true);
      expectEnabledSheetShown();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('shows the setting-up banner again for a new migration', async () => {
      moneyMfaStore.setState({ isMigrationBannerDismissed: true });
      const finish = deferMigration();
      const { result } = arrange();

      let turnOn: Promise<void> = Promise.resolve();
      await act(async () => {
        turnOn = result.current.turnOn();
      });

      expect(result.current.status).toBe('setting_up');
      expect(result.current.isSettingUpBannerDismissed).toBe(false);
      await act(async () => {
        finish(true);
        await turnOn;
      });
    });

    it('leaves 2FA off when the migration fails', async () => {
      const finish = deferMigration();
      const { result } = arrange();

      let turnOn: Promise<void> = Promise.resolve();
      await act(async () => {
        turnOn = result.current.turnOn();
      });
      await act(async () => {
        finish(false);
        await turnOn;
      });

      expect(result.current.status).toBe('failed');
      expect(moneyMfaStore.getState().isMoneyAccountMfaEnabled).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('turns 2FA back on with a toast and no migration when it was done before', async () => {
      setMigration('done');
      const { result } = arrange({ credentials: [activePasskey, activeTotp] });

      await act(async () => {
        await result.current.turnOn();
      });

      expect(result.current.status).toBe('enabled');
      expect(mockStart).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expectToast('money.mfa.toast_on');
    });

    it('leaves state unchanged when the kit is cancelled', async () => {
      mockVerifyOrEnroll.mockRejectedValue(new Error('flow_cancelled'));
      const { result } = arrange();

      await act(async () => {
        await result.current.turnOn();
      });

      expect(mockStart).not.toHaveBeenCalled();
      expect(result.current.status).toBe('not_set_up');
    });

    it('does nothing while the migration is running', async () => {
      const finish = deferMigration();
      setMigration('migrating');
      const { result } = arrange();

      await act(async () => {
        await result.current.turnOn();
      });

      expect(mockVerifyOrEnroll).not.toHaveBeenCalled();
      await act(async () => {
        finish(true);
      });
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
    it('runs the migration again without the kit', async () => {
      setMigration('failed');
      const { result } = arrange();

      await act(async () => {
        await result.current.retry();
      });

      expect(mockStart).toHaveBeenCalledTimes(1);
      expect(mockVerifyOrEnroll).not.toHaveBeenCalled();
      expect(result.current.status).toBe('enabled');
      expectEnabledSheetShown();
    });

    it('shows the setting-up banner again after it was dismissed', async () => {
      setMigration('failed');
      moneyMfaStore.setState({ isMigrationBannerDismissed: true });
      const { result } = arrange();

      await act(async () => {
        await result.current.retry();
      });

      expect(moneyMfaStore.getState().isMigrationBannerDismissed).toBe(false);
    });
  });

  describe('turnOff', () => {
    beforeEach(() => {
      setMigration('done');
      moneyMfaStore.setState({ isMoneyAccountMfaEnabled: true });
    });

    it('verifies with a Money method, turns 2FA off and shows a toast', async () => {
      const { result } = arrange({ credentials: [activePasskey, activeTotp] });

      await act(async () => {
        await result.current.turnOff();
      });

      expect(mockVerifyOrEnroll).toHaveBeenCalledWith({
        methods: ['passkey', 'totp'],
        verifyWith: ['passkey', 'totp'],
        maxSessionAgeMs: 0,
        reason: expect.objectContaining({ operation: 'money.mfa.turnOff' }),
      });
      expect(result.current.status).toBe('off');
      expectToast('money.mfa.toast_off');
    });

    it('still asks for verification when no credentials are loaded', async () => {
      const { result } = arrange({ credentials: [] });

      await act(async () => {
        await result.current.turnOff();
      });

      expect(mockVerifyOrEnroll).toHaveBeenCalledWith(
        expect.objectContaining({
          methods: ['passkey', 'totp'],
          verifyWith: ['passkey', 'totp'],
          maxSessionAgeMs: 0,
        }),
      );
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

  describe('dismissSettingUpBanner', () => {
    it('remembers that the setting-up banner was closed', () => {
      const { result } = arrange();

      act(() => {
        result.current.dismissSettingUpBanner();
      });

      expect(result.current.isSettingUpBannerDismissed).toBe(true);
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
