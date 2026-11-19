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
} from './passwordlessRecoveryHold';
import {
  fetchRecoverySecret,
  findRecoveryIdentifier,
  setLocalAndGlobalPassword,
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
  setLocalAndGlobalPassword: jest.fn(),
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
    jest.mocked(setLocalAndGlobalPassword).mockResolvedValue(undefined);
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
      { canProveSocialIdentifier: true, allowPasskey: true },
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

  it('prefetches with allowPasskey false so MFA does not open a 2nd passkey', async () => {
    expect(
      await PasswordlessRecoveryService.prefetchForChoosePassword('google', {
        allowPasskey: false,
      }),
    ).toBe(true);

    expect(findRecoveryIdentifier).toHaveBeenCalledWith(
      { deps: true },
      { canProveSocialIdentifier: true, allowPasskey: false },
    );
  });

  it('recover sets the local and global password without reading a Recovery Secret', async () => {
    await PasswordlessRecoveryService.prepare('google');

    await PasswordlessRecoveryService.recover('new-password', jest.fn());

    expect(setLocalAndGlobalPassword).toHaveBeenCalledWith(
      { deps: true },
      'new-password',
    );
    expect(fetchRecoverySecret).not.toHaveBeenCalled();
  });

  it('recover drops a held Recovery Secret before setting the password', async () => {
    await PasswordlessRecoveryService.prefetchForChoosePassword('google');
    expect(hasPasswordlessRecoveryHold()).toBe(true);

    await PasswordlessRecoveryService.recover('new-password', jest.fn());

    expect(hasPasswordlessRecoveryHold()).toBe(false);
    expect(setLocalAndGlobalPassword).toHaveBeenCalledWith(
      { deps: true },
      'new-password',
    );
  });
});
