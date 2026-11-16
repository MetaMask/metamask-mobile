import { Alert, Platform } from 'react-native';
import Engine from '../Engine';
import { AuthConnection } from '../OAuthService/OAuthInterface';
import { createLoginHandler } from '../OAuthService/OAuthLoginHandlers';
import OAuthService from '../OAuthService/OAuthService';
import { buildOidcIdentifier } from './seedlessPasswordUnlockViaMfa';

export interface RunDevMfaSocialUnlockParams {
  authConnection?: string | null;
  seedlessUserId?: string | null;
  /**
   * Login screen also requires an active seedless login flow. OAuth rehydrate
   * already implies that, so pass `false` there.
   */
  requireSeedlessLoginFlow?: boolean;
  isSeedlessLogin?: boolean;
  telegramLoginEnabled: boolean;
  platformOS?: typeof Platform.OS;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export interface RunDevMfaSocialUnlockDeps {
  isDev?: boolean;
  alert?: (title: string, message?: string) => void;
  hasMfaRecoveryController?: () => boolean;
  createLoginHandlerFn?: typeof createLoginHandler;
  handleMfaSeedlessPasswordUnlock?: typeof OAuthService.handleMfaSeedlessPasswordUnlock;
}

const defaultHasMfaRecoveryController = (): boolean =>
  Boolean(
    (Engine.context as { MfaRecoveryController?: unknown })
      .MfaRecoveryController,
  );

/**
 * Shared DEV-only left-hand MFA social unlock used by Login and OAuthRehydration.
 * Production UI already hides the entry point behind `__DEV__`.
 */
export async function runDevMfaSocialUnlock(
  params: RunDevMfaSocialUnlockParams,
  deps: RunDevMfaSocialUnlockDeps = {},
): Promise<void> {
  const {
    authConnection,
    seedlessUserId,
    requireSeedlessLoginFlow = false,
    isSeedlessLogin = false,
    telegramLoginEnabled,
    platformOS = Platform.OS,
    setLoading,
    setError,
  } = params;

  const isDev = deps.isDev ?? __DEV__;
  const alert = deps.alert ?? Alert.alert.bind(Alert);
  const hasMfaRecoveryController =
    deps.hasMfaRecoveryController ?? defaultHasMfaRecoveryController;
  const createHandler = deps.createLoginHandlerFn ?? createLoginHandler;
  const unlock =
    deps.handleMfaSeedlessPasswordUnlock ??
    OAuthService.handleMfaSeedlessPasswordUnlock.bind(OAuthService);

  if (!isDev) {
    return;
  }

  const provider = authConnection as AuthConnection | undefined;

  if (!hasMfaRecoveryController()) {
    alert('DEV MFA', 'MfaRecoveryController is not on Engine.context');
    return;
  }

  const hasSeedlessPrereqs = Boolean(provider && seedlessUserId);
  const seedlessLoginOk = !requireSeedlessLoginFlow || isSeedlessLogin;
  if (!hasSeedlessPrereqs || !seedlessLoginOk) {
    alert(
      'DEV MFA',
      requireSeedlessLoginFlow
        ? 'Need a locked seedless social wallet (authConnection + userId)'
        : 'Missing seedless authConnection or userId on this device',
    );
    return;
  }

  try {
    setLoading(true);
    setError(null);
    const loginHandler = createHandler(platformOS, provider, false, {
      telegramLoginEnabled,
    });

    await unlock(
      {
        identifier: buildOidcIdentifier({ authConnection: provider }),
        expectedSeedlessUserId: seedlessUserId as string,
        authConnection: provider,
        clientId: loginHandler.options.clientId,
      },
      true,
    );

    alert(
      'DEV MFA OK',
      'MfaRecoveryController path succeeded. Enter password to unlock the vault.',
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    setError(message);
    alert('DEV MFA failed', message);
  } finally {
    setLoading(false);
  }
}
