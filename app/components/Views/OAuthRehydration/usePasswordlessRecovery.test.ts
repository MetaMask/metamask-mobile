import { Platform } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import type { Identifier } from '@metamask/mfa-recovery-controller';
import { usePasswordlessRecovery } from './usePasswordlessRecovery';
import { isMfaRecoveryConfigured } from '../../../core/Engine/controllers/mfa-recovery-controller/config';
import {
  canProveSocialIdentifier,
  createPasswordlessRecoveryDependencies,
} from '../../../core/MfaRecovery/engineBindings';
import {
  findRecoveryIdentifier,
  recoverWalletWithoutPassword,
} from '../../../core/MfaRecovery/passwordlessSocialRecovery';
import Logger from '../../../util/Logger';

let mockIsFlagEnabled = true;

jest.mock('react-redux', () => ({
  useSelector: () => mockIsFlagEnabled,
}));

jest.mock(
  '../../../core/Engine/controllers/mfa-recovery-controller/config',
  () => ({
    isMfaRecoveryConfigured: jest.fn(),
  }),
);

jest.mock('../../../core/MfaRecovery/engineBindings', () => ({
  canProveSocialIdentifier: jest.fn(),
  createPasswordlessRecoveryDependencies: jest.fn(() => ({ deps: true })),
}));

jest.mock('../../../core/MfaRecovery/passwordlessSocialRecovery', () => ({
  findRecoveryIdentifier: jest.fn(),
  recoverWalletWithoutPassword: jest.fn(),
}));

jest.mock('../../../util/Logger', () => ({
  log: jest.fn(),
}));

const PASSKEY: Identifier = {
  type: 'passkey',
  namespace: 'metamask.io',
  value: 'cred-1',
};

describe('usePasswordlessRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFlagEnabled = true;
    jest.mocked(isMfaRecoveryConfigured).mockReturnValue(true);
    jest.mocked(canProveSocialIdentifier).mockReturnValue(true);
    jest.mocked(findRecoveryIdentifier).mockResolvedValue(PASSKEY);
    jest.mocked(recoverWalletWithoutPassword).mockResolvedValue(undefined);
  });

  it('returns false from prepare when the feature flag is off', async () => {
    mockIsFlagEnabled = false;

    const { result } = renderHook(() => usePasswordlessRecovery('google'));

    await act(async () => {
      expect(await result.current.prepare()).toBe(false);
    });

    expect(findRecoveryIdentifier).not.toHaveBeenCalled();
  });

  it('returns false from prepare when recovery is not configured', async () => {
    jest.mocked(isMfaRecoveryConfigured).mockReturnValue(false);

    const { result } = renderHook(() => usePasswordlessRecovery('google'));

    await act(async () => {
      expect(await result.current.prepare()).toBe(false);
    });

    expect(findRecoveryIdentifier).not.toHaveBeenCalled();
  });

  it('returns true from prepare when an identifier is found', async () => {
    const { result } = renderHook(() => usePasswordlessRecovery('google'));

    await act(async () => {
      expect(await result.current.prepare()).toBe(true);
    });

    expect(canProveSocialIdentifier).toHaveBeenCalledWith(
      Platform.OS,
      'google',
    );
    expect(findRecoveryIdentifier).toHaveBeenCalledWith(
      { deps: true },
      { canProveSocialIdentifier: true },
    );
    expect(createPasswordlessRecoveryDependencies).toHaveBeenCalled();
  });

  it('returns false and logs when prepare cannot find an identifier', async () => {
    jest
      .mocked(findRecoveryIdentifier)
      .mockRejectedValue(Object.assign(new Error('missing'), { code: 'gone' }));

    const { result } = renderHook(() => usePasswordlessRecovery('google'));

    await act(async () => {
      expect(await result.current.prepare()).toBe(false);
    });

    expect(Logger.log).toHaveBeenCalledWith(
      'OAuthRehydration: passwordless recovery unavailable',
      { code: 'gone' },
    );
  });

  it('throws from recover when prepare has not stored an identifier', async () => {
    jest.mocked(findRecoveryIdentifier).mockResolvedValue(null as never);

    const { result } = renderHook(() => usePasswordlessRecovery('google'));

    await act(async () => {
      await result.current.prepare();
    });

    await expect(
      result.current.recover('new-password', jest.fn()),
    ).rejects.toThrow('Passwordless recovery is not prepared');
  });

  it('runs passwordless recovery after a successful prepare', async () => {
    const restoreVault = jest.fn();
    const { result } = renderHook(() => usePasswordlessRecovery('google'));

    await act(async () => {
      await result.current.prepare();
    });

    await act(async () => {
      await result.current.recover('new-password', restoreVault);
    });

    expect(recoverWalletWithoutPassword).toHaveBeenCalledWith(
      { deps: true },
      {
        identifier: PASSKEY,
        newPassword: 'new-password',
        restoreVault,
      },
    );
  });
});
