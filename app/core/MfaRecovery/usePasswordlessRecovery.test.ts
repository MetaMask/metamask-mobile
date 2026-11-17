import { Platform } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import type { Identifier } from '@metamask/mfa-recovery-controller';
import { usePasswordlessRecovery } from './usePasswordlessRecovery';
import { isMfaRecoveryConfigured } from '../Engine/controllers/mfa-recovery-controller/config';
import {
  canProveSocialIdentifier,
  createPasswordlessRecoveryService,
} from './engineBindings';
import {
  clearPasswordlessRecoveryHold,
  hasPasswordlessRecoveryHold,
  takePasswordlessRecoveryHold,
} from './passwordlessRecoveryHold';
import { recoverWalletWithoutPassword } from './passwordlessSocialRecovery';
import Logger from '../../util/Logger';

let mockIsFlagEnabled = true;

const mockPasswordlessService = {
  findRecoveryIdentifier: jest.fn(),
  readRecoverySecret: jest.fn(),
};

jest.mock('react-redux', () => ({
  useSelector: () => mockIsFlagEnabled,
}));

jest.mock('../Engine/controllers/mfa-recovery-controller/config', () => ({
  isMfaRecoveryConfigured: jest.fn(),
}));

jest.mock('./engineBindings', () => ({
  canProveSocialIdentifier: jest.fn(),
  createPasswordlessRecoveryService: jest.fn(() => mockPasswordlessService),
}));

jest.mock('./passwordlessSocialRecovery', () => ({
  recoverWalletWithoutPassword: jest.fn(),
}));

jest.mock('../../util/Logger', () => ({
  log: jest.fn(),
}));

const PASSKEY: Identifier = {
  type: 'passkey',
  namespace: 'metamask.io',
  value: 'cred-1',
};

const SECRET = new Uint8Array(32).fill(7);

describe('usePasswordlessRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPasswordlessRecoveryHold();
    mockIsFlagEnabled = true;
    jest.mocked(isMfaRecoveryConfigured).mockReturnValue(true);
    jest.mocked(canProveSocialIdentifier).mockReturnValue(true);
    mockPasswordlessService.findRecoveryIdentifier.mockResolvedValue(PASSKEY);
    mockPasswordlessService.readRecoverySecret.mockResolvedValue({
      epoch: 1,
      recoverySecret: new Uint8Array(SECRET),
    });
    jest.mocked(recoverWalletWithoutPassword).mockResolvedValue(undefined);
  });

  afterEach(() => {
    clearPasswordlessRecoveryHold();
  });

  it('returns false from prepare when the feature flag is off', async () => {
    mockIsFlagEnabled = false;

    const { result } = renderHook(() => usePasswordlessRecovery('google'));

    await act(async () => {
      expect(await result.current.prepare()).toBe(false);
    });

    expect(
      mockPasswordlessService.findRecoveryIdentifier,
    ).not.toHaveBeenCalled();
  });

  it('returns false from prepare when recovery is not configured', async () => {
    jest.mocked(isMfaRecoveryConfigured).mockReturnValue(false);

    const { result } = renderHook(() => usePasswordlessRecovery('google'));

    await act(async () => {
      expect(await result.current.prepare()).toBe(false);
    });

    expect(
      mockPasswordlessService.findRecoveryIdentifier,
    ).not.toHaveBeenCalled();
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
    expect(mockPasswordlessService.findRecoveryIdentifier).toHaveBeenCalledWith(
      { canProveSocialIdentifier: true },
    );
    expect(createPasswordlessRecoveryService).toHaveBeenCalled();
  });

  it('returns false and logs when prepare cannot find an identifier', async () => {
    mockPasswordlessService.findRecoveryIdentifier.mockRejectedValue(
      Object.assign(new Error('missing'), { code: 'gone' }),
    );

    const { result } = renderHook(() => usePasswordlessRecovery('google'));

    await act(async () => {
      expect(await result.current.prepare()).toBe(false);
    });

    expect(Logger.log).toHaveBeenCalledWith(
      'OAuthRehydration: passwordless recovery unavailable',
      { reason: 'find_identifier_failed', code: 'gone' },
    );
  });

  it('prefetches the Recovery Secret into the cross-screen hold', async () => {
    const { result } = renderHook(() => usePasswordlessRecovery('google'));

    await act(async () => {
      expect(await result.current.prefetchForChoosePassword()).toBe(true);
    });

    expect(mockPasswordlessService.readRecoverySecret).toHaveBeenCalledWith(
      PASSKEY,
    );
    expect(hasPasswordlessRecoveryHold()).toBe(true);
  });

  it('recovers from the cross-screen hold without a local prepare', async () => {
    const restoreVault = jest.fn();
    const prefetchHook = renderHook(() => usePasswordlessRecovery('google'));
    await act(async () => {
      await prefetchHook.result.current.prefetchForChoosePassword();
    });

    // ChoosePassword is a separate hook instance.
    const choosePasswordHook = renderHook(() =>
      usePasswordlessRecovery('google'),
    );

    await act(async () => {
      await choosePasswordHook.result.current.recover(
        'new-password',
        restoreVault,
      );
    });

    expect(recoverWalletWithoutPassword).toHaveBeenCalledWith(
      mockPasswordlessService,
      {
        identifier: PASSKEY,
        newPassword: 'new-password',
        restoreVault,
        recoverySecret: expect.any(Uint8Array),
      },
    );
    expect(hasPasswordlessRecoveryHold()).toBe(false);
  });

  it('throws from recover when neither hold nor prepare is ready', async () => {
    mockPasswordlessService.findRecoveryIdentifier.mockResolvedValue(
      null as never,
    );

    const { result } = renderHook(() => usePasswordlessRecovery('google'));

    await act(async () => {
      await result.current.prepare();
    });

    await expect(
      result.current.recover('new-password', jest.fn()),
    ).rejects.toThrow('Passwordless recovery is not prepared');
  });

  it('runs passwordless recovery after a successful prepare without hold', async () => {
    const restoreVault = jest.fn();
    const { result } = renderHook(() => usePasswordlessRecovery('google'));

    await act(async () => {
      await result.current.prepare();
    });

    // Ensure no hold — recover falls back to local identifier (may passkey).
    expect(takePasswordlessRecoveryHold()).toBeNull();

    await act(async () => {
      await result.current.recover('new-password', restoreVault);
    });

    expect(recoverWalletWithoutPassword).toHaveBeenCalledWith(
      mockPasswordlessService,
      {
        identifier: PASSKEY,
        newPassword: 'new-password',
        restoreVault,
      },
    );
  });
});
