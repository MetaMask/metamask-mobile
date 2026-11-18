import { Platform } from 'react-native';
import type { Identifier } from '@metamask/mfa-recovery-controller';
import PasswordlessRecoveryService from './PasswordlessRecoveryService';
import ReduxService from '../redux';
import { selectMfaRecoveryEnabled } from '../../selectors/featureFlagController/mfaRecovery';
import { isMfaRecoveryConfigured } from '../Engine/controllers/mfa-recovery-controller/config';
import {
  canProveSocialIdentifier,
  createPasswordlessRecoveryDependencies,
} from './engineBindings';
import {
  clearPasswordlessRecoveryHold,
  hasPasswordlessRecoveryHold,
  takePasswordlessRecoveryHold,
} from './passwordlessRecoveryHold';
import {
  fetchRecoverySecret,
  findRecoveryIdentifier,
  recoverWalletWithoutPassword,
} from './passwordlessSocialRecovery';
import Logger from '../../util/Logger';

jest.mock('../redux', () => ({
  store: { getState: jest.fn(() => ({ mock: true })) },
}));

jest.mock('../../selectors/featureFlagController/mfaRecovery', () => ({
  selectMfaRecoveryEnabled: jest.fn(() => true),
}));

jest.mock('../Engine/controllers/mfa-recovery-controller/config', () => ({
  isMfaRecoveryConfigured: jest.fn(),
}));

jest.mock('./engineBindings', () => ({
  canProveSocialIdentifier: jest.fn(),
  createPasswordlessRecoveryDependencies: jest.fn(() => ({ deps: true })),
}));

jest.mock('./passwordlessSocialRecovery', () => ({
  findRecoveryIdentifier: jest.fn(),
  fetchRecoverySecret: jest.fn(),
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

describe('PasswordlessRecoveryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PasswordlessRecoveryService.clear();
    clearPasswordlessRecoveryHold();
    jest.mocked(selectMfaRecoveryEnabled).mockReturnValue(true);
    jest.mocked(isMfaRecoveryConfigured).mockReturnValue(true);
    jest.mocked(canProveSocialIdentifier).mockReturnValue(true);
    jest.mocked(findRecoveryIdentifier).mockResolvedValue(PASSKEY);
    jest.mocked(fetchRecoverySecret).mockResolvedValue(new Uint8Array(SECRET));
    jest.mocked(recoverWalletWithoutPassword).mockResolvedValue(undefined);
    jest.mocked(ReduxService.store.getState).mockReturnValue({ mock: true });
  });

  afterEach(() => {
    PasswordlessRecoveryService.clear();
    clearPasswordlessRecoveryHold();
  });

  it('returns false from prepare when the feature flag is off', async () => {
    jest.mocked(selectMfaRecoveryEnabled).mockReturnValue(false);

    expect(await PasswordlessRecoveryService.prepare('google')).toBe(false);

    expect(findRecoveryIdentifier).not.toHaveBeenCalled();
    expect(ReduxService.store.getState).toHaveBeenCalled();
  });

  it('returns false from prepare when recovery is not configured', async () => {
    jest.mocked(isMfaRecoveryConfigured).mockReturnValue(false);

    expect(await PasswordlessRecoveryService.prepare('google')).toBe(false);

    expect(findRecoveryIdentifier).not.toHaveBeenCalled();
  });

  it('returns true from prepare when an identifier is found', async () => {
    expect(await PasswordlessRecoveryService.prepare('google')).toBe(true);

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

    expect(await PasswordlessRecoveryService.prepare('google')).toBe(false);

    expect(Logger.log).toHaveBeenCalledWith(
      'OAuthRehydration: passwordless recovery unavailable',
      { reason: 'find_identifier_failed', code: 'gone' },
    );
  });

  it('prefetches the Recovery Secret into the cross-screen hold', async () => {
    expect(
      await PasswordlessRecoveryService.prefetchForChoosePassword('google'),
    ).toBe(true);

    expect(fetchRecoverySecret).toHaveBeenCalledWith({ deps: true }, PASSKEY);
    expect(hasPasswordlessRecoveryHold()).toBe(true);
  });

  it('recovers from the cross-screen hold without a second prepare', async () => {
    const restoreVault = jest.fn();
    await PasswordlessRecoveryService.prefetchForChoosePassword('google');

    // Simulate ChoosePassword: clear local prepare state; hold remains.
    // Service.recover prefers the hold regardless of prepared identifier.
    await PasswordlessRecoveryService.recover('new-password', restoreVault);

    expect(recoverWalletWithoutPassword).toHaveBeenCalledWith(
      { deps: true },
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
    jest.mocked(findRecoveryIdentifier).mockResolvedValue(null as never);

    await PasswordlessRecoveryService.prepare('google');

    await expect(
      PasswordlessRecoveryService.recover('new-password', jest.fn()),
    ).rejects.toThrow('Passwordless recovery is not prepared');
  });

  it('runs passwordless recovery after a successful prepare without hold', async () => {
    const restoreVault = jest.fn();
    await PasswordlessRecoveryService.prepare('google');

    // Ensure no hold — recover falls back to prepared identifier (may passkey).
    expect(takePasswordlessRecoveryHold()).toBeNull();

    await PasswordlessRecoveryService.recover('new-password', restoreVault);

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
