import { AuthConnection } from '../OAuthService/OAuthInterface';
import { runDevMfaSocialUnlock } from './runDevMfaSocialUnlock';

describe('runDevMfaSocialUnlock', () => {
  const setLoading = jest.fn();
  const setError = jest.fn();
  const alert = jest.fn();
  const createLoginHandlerFn = jest.fn(() => ({
    options: { clientId: 'client-1' },
  }));
  const handleMfaSeedlessPasswordUnlock = jest.fn().mockResolvedValue({
    type: 'success',
    existingUser: true,
  });

  const baseParams = {
    authConnection: AuthConnection.Google,
    seedlessUserId: 'user-1',
    telegramLoginEnabled: true,
    platformOS: 'ios' as const,
    setLoading,
    setError,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    handleMfaSeedlessPasswordUnlock.mockResolvedValue({
      type: 'success',
      existingUser: true,
    });
  });

  it('no-ops when not in DEV', async () => {
    await runDevMfaSocialUnlock(baseParams, {
      isDev: false,
      alert,
      hasMfaRecoveryController: () => true,
      createLoginHandlerFn: createLoginHandlerFn as never,
      handleMfaSeedlessPasswordUnlock: handleMfaSeedlessPasswordUnlock as never,
    });

    expect(alert).not.toHaveBeenCalled();
    expect(handleMfaSeedlessPasswordUnlock).not.toHaveBeenCalled();
  });

  it('alerts when MfaRecoveryController is missing', async () => {
    await runDevMfaSocialUnlock(baseParams, {
      isDev: true,
      alert,
      hasMfaRecoveryController: () => false,
      createLoginHandlerFn: createLoginHandlerFn as never,
      handleMfaSeedlessPasswordUnlock: handleMfaSeedlessPasswordUnlock as never,
    });

    expect(alert).toHaveBeenCalledWith(
      'DEV MFA',
      'MfaRecoveryController is not on Engine.context',
    );
    expect(handleMfaSeedlessPasswordUnlock).not.toHaveBeenCalled();
  });

  it('alerts with Login prereq message when seedless login flow is required', async () => {
    await runDevMfaSocialUnlock(
      {
        ...baseParams,
        requireSeedlessLoginFlow: true,
        isSeedlessLogin: false,
      },
      {
        isDev: true,
        alert,
        hasMfaRecoveryController: () => true,
        createLoginHandlerFn: createLoginHandlerFn as never,
        handleMfaSeedlessPasswordUnlock:
          handleMfaSeedlessPasswordUnlock as never,
      },
    );

    expect(alert).toHaveBeenCalledWith(
      'DEV MFA',
      'Need a locked seedless social wallet (authConnection + userId)',
    );
  });

  it('alerts with rehydrate prereq message when authConnection/userId missing', async () => {
    await runDevMfaSocialUnlock(
      {
        ...baseParams,
        authConnection: null,
        seedlessUserId: null,
      },
      {
        isDev: true,
        alert,
        hasMfaRecoveryController: () => true,
        createLoginHandlerFn: createLoginHandlerFn as never,
        handleMfaSeedlessPasswordUnlock:
          handleMfaSeedlessPasswordUnlock as never,
      },
    );

    expect(alert).toHaveBeenCalledWith(
      'DEV MFA',
      'Missing seedless authConnection or userId on this device',
    );
  });

  it('runs MFA unlock and alerts success', async () => {
    await runDevMfaSocialUnlock(baseParams, {
      isDev: true,
      alert,
      hasMfaRecoveryController: () => true,
      createLoginHandlerFn: createLoginHandlerFn as never,
      handleMfaSeedlessPasswordUnlock: handleMfaSeedlessPasswordUnlock as never,
    });

    expect(setLoading).toHaveBeenCalledWith(true);
    expect(setError).toHaveBeenCalledWith(null);
    expect(createLoginHandlerFn).toHaveBeenCalledWith(
      'ios',
      AuthConnection.Google,
      false,
      { telegramLoginEnabled: true },
    );
    expect(handleMfaSeedlessPasswordUnlock).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedSeedlessUserId: 'user-1',
        authConnection: AuthConnection.Google,
        clientId: 'client-1',
        identifier: expect.objectContaining({
          type: 'social',
          value: '',
        }),
      }),
      true,
    );
    expect(alert).toHaveBeenCalledWith(
      'DEV MFA OK',
      'MfaRecoveryController path succeeded. Enter password to unlock the vault.',
    );
    expect(setLoading).toHaveBeenLastCalledWith(false);
  });

  it('surfaces unlock failures via setError and alert', async () => {
    handleMfaSeedlessPasswordUnlock.mockRejectedValueOnce(
      new Error('nonce mismatch'),
    );

    await runDevMfaSocialUnlock(baseParams, {
      isDev: true,
      alert,
      hasMfaRecoveryController: () => true,
      createLoginHandlerFn: createLoginHandlerFn as never,
      handleMfaSeedlessPasswordUnlock: handleMfaSeedlessPasswordUnlock as never,
    });

    expect(setError).toHaveBeenCalledWith('nonce mismatch');
    expect(alert).toHaveBeenCalledWith('DEV MFA failed', 'nonce mismatch');
    expect(setLoading).toHaveBeenLastCalledWith(false);
  });

  it('stringifies non-Error unlock failures', async () => {
    handleMfaSeedlessPasswordUnlock.mockRejectedValueOnce('boom');

    await runDevMfaSocialUnlock(baseParams, {
      isDev: true,
      alert,
      hasMfaRecoveryController: () => true,
      createLoginHandlerFn: createLoginHandlerFn as never,
      handleMfaSeedlessPasswordUnlock: handleMfaSeedlessPasswordUnlock as never,
    });

    expect(setError).toHaveBeenCalledWith('boom');
    expect(alert).toHaveBeenCalledWith('DEV MFA failed', 'boom');
  });
});
