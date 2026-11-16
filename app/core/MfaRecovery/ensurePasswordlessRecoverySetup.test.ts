jest.mock('../Engine', () => ({
  context: {
    KeyringController: { isUnlocked: jest.fn(() => true) },
    SeedlessOnboardingController: {
      state: { envelope: null, vault: 'vault', authConnection: 'google' },
      getAccessToken: jest.fn(),
    },
    MfaRecoveryController: { name: 'mfaRecovery' },
    AuthenticationController: {
      requestMfaApproval: jest.fn(),
      getVerificationToken: jest.fn(),
    },
  },
}));

jest.mock('../redux', () => ({
  store: { getState: jest.fn(() => ({ mock: true })) },
}));

jest.mock('../../selectors/featureFlagController/mfaRecovery', () => ({
  selectMfaRecoveryEnabled: jest.fn(() => true),
}));

jest.mock('../../selectors/seedlessOnboardingController', () => ({
  selectSeedlessOnboardingLoginFlow: jest.fn(() => true),
}));

jest.mock('../Engine/controllers/mfa-recovery-controller/config', () => ({
  isMfaRecoveryConfigured: jest.fn(() => true),
  getCubistConfig: jest.fn(() => ({ authAudience: 'cubist-aud' })),
  getToprfRecoveryConfig: jest.fn(() => ({
    aal2Audience: 'aal2',
    authConnectionId: 'auth',
    groupedAuthConnectionId: 'grouped',
  })),
}));

jest.mock('../Engine/controllers/mfa-recovery-controller/errors', () => ({
  getMfaRecoveryErrorCode: jest.fn(() => 'unknown'),
}));

jest.mock('../apiEnv', () => ({
  authEnv: jest.fn(() => 'dev'),
}));

jest.mock('react-native-quick-crypto', () => ({
  randomBytes: jest.fn((length: number) => Buffer.alloc(length, 1)),
}));

jest.mock('../../util/identity/mfa/useMfa', () => ({
  verifyOrEnroll: jest.fn().mockResolvedValue({ token: 'tok' }),
}));

jest.mock('./linkSocialLogin', () => ({
  linkSocialLogin: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./setupPasswordlessRecovery', () => ({
  PasswordlessRecoverySetupError: class PasswordlessRecoverySetupError extends Error {
    code: string;
    detail?: string;
    constructor(code: string, detail?: string) {
      super(code);
      this.code = code;
      this.detail = detail;
    }
  },
  setupPasswordlessRecovery: jest.fn(),
}));

jest.mock('../../util/Logger', () => ({
  log: jest.fn(),
}));

import Engine from '../Engine';
import ReduxService from '../redux';
import { selectMfaRecoveryEnabled } from '../../selectors/featureFlagController/mfaRecovery';
import { selectSeedlessOnboardingLoginFlow } from '../../selectors/seedlessOnboardingController';
import { isMfaRecoveryConfigured } from '../Engine/controllers/mfa-recovery-controller/config';
import { setupPasswordlessRecovery } from './setupPasswordlessRecovery';
import { ensurePasswordlessRecoverySetup } from './ensurePasswordlessRecoverySetup';

describe('ensurePasswordlessRecoverySetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(selectMfaRecoveryEnabled).mockReturnValue(true);
    jest.mocked(selectSeedlessOnboardingLoginFlow).mockReturnValue(true);
    jest.mocked(isMfaRecoveryConfigured).mockReturnValue(true);
    jest
      .mocked(Engine.context.KeyringController.isUnlocked)
      .mockReturnValue(true);
    Engine.context.SeedlessOnboardingController.state = {
      envelope: null,
      vault: 'vault',
      authConnection: 'google',
    } as never;
    jest.mocked(setupPasswordlessRecovery).mockResolvedValue('enabled');
    jest.mocked(ReduxService.store.getState).mockReturnValue({ mock: true });
  });

  it('skips when the mfaRecovery flag is off', async () => {
    jest.mocked(selectMfaRecoveryEnabled).mockReturnValue(false);

    await expect(ensurePasswordlessRecoverySetup()).resolves.toEqual({
      status: 'skipped',
      reason: 'flag_off',
    });
    expect(setupPasswordlessRecovery).not.toHaveBeenCalled();
  });

  it('skips when Cubist config is missing', async () => {
    jest.mocked(isMfaRecoveryConfigured).mockReturnValue(false);

    await expect(ensurePasswordlessRecoverySetup()).resolves.toEqual({
      status: 'skipped',
      reason: 'not_configured',
    });
  });

  it('skips when the wallet is not seedless', async () => {
    jest.mocked(selectSeedlessOnboardingLoginFlow).mockReturnValue(false);

    await expect(ensurePasswordlessRecoverySetup()).resolves.toEqual({
      status: 'skipped',
      reason: 'not_seedless',
    });
  });

  it('skips when the keyring is locked', async () => {
    jest
      .mocked(Engine.context.KeyringController.isUnlocked)
      .mockReturnValue(false);

    await expect(ensurePasswordlessRecoverySetup()).resolves.toEqual({
      status: 'skipped',
      reason: 'locked',
    });
  });

  it('returns already_enabled when the vault is sealed', async () => {
    Engine.context.SeedlessOnboardingController.state = {
      envelope: { sealed: true },
      vault: 'vault',
    } as never;

    await expect(ensurePasswordlessRecoverySetup()).resolves.toEqual({
      status: 'already_enabled',
    });
    expect(setupPasswordlessRecovery).not.toHaveBeenCalled();
  });

  it('runs setup and returns enabled', async () => {
    await expect(ensurePasswordlessRecoverySetup()).resolves.toEqual({
      status: 'enabled',
    });
    expect(setupPasswordlessRecovery).toHaveBeenCalledTimes(1);
    const deps = jest.mocked(setupPasswordlessRecovery).mock.calls[0][0];
    expect(deps.cubistAuthAudience).toBe('cubist-aud');
  });

  it('returns failed without throwing when setup rejects', async () => {
    const { PasswordlessRecoverySetupError } = jest.requireMock(
      './setupPasswordlessRecovery',
    ) as {
      PasswordlessRecoverySetupError: new (
        code: string,
        detail?: string,
      ) => Error & { code: string; detail?: string };
    };
    jest
      .mocked(setupPasswordlessRecovery)
      .mockRejectedValue(
        new PasswordlessRecoverySetupError('passkey_not_enrolled'),
      );

    await expect(ensurePasswordlessRecoverySetup()).resolves.toEqual({
      status: 'failed',
      code: 'passkey_not_enrolled',
    });
  });

  it('coalesces concurrent callers onto one setup run', async () => {
    let resolveSetup: (value: 'enabled') => void = () => undefined;
    jest.mocked(setupPasswordlessRecovery).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSetup = resolve;
        }),
    );

    const first = ensurePasswordlessRecoverySetup();
    const second = ensurePasswordlessRecoverySetup();
    resolveSetup('enabled');

    await expect(Promise.all([first, second])).resolves.toEqual([
      { status: 'enabled' },
      { status: 'enabled' },
    ]);
    expect(setupPasswordlessRecovery).toHaveBeenCalledTimes(1);
  });
});
