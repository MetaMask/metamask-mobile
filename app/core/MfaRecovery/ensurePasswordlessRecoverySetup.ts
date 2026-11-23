import Engine from '../Engine';
import { isMfaRecoveryConfigured } from '../Engine/controllers/mfa-recovery-controller/config';
import { getMfaRecoveryErrorCode } from '../Engine/controllers/mfa-recovery-controller/errors';
import ReduxService from '../redux';
import { selectMfaRecoveryEnabled } from '../../selectors/featureFlagController/mfaRecovery';
import { selectSeedlessOnboardingLoginFlow } from '../../selectors/seedlessOnboardingController';
import { verifyOrEnroll } from '../../util/identity/mfa/useMfa';
import Logger from '../../util/Logger';
import {
  PasswordlessRecoverySetupError,
  setupPasswordlessRecovery,
  type PasswordlessRecoverySetupResult,
} from './setupPasswordlessRecovery';

/** MFA kit reason — must use a `settings.*` entry point. */
const MFA_SETUP_REASON = {
  operation: 'settings.passwordless_recovery_setup' as const,
  presentation: 'modal' as const,
};

export type EnsurePasswordlessRecoverySetupResult =
  | { status: 'enabled' }
  | { status: 'already_enabled' }
  | {
      status: 'skipped';
      reason: 'flag_off' | 'not_configured' | 'locked' | 'not_seedless';
    }
  | { status: 'failed'; code: string };

let inFlight: Promise<EnsurePasswordlessRecoverySetupResult> | null = null;

/**
 * Seals passwordless recovery for an unlocked social wallet when needed.
 *
 * No Settings UI and no verifier ID. May show the OS passkey sheet to enroll
 * or prove a passkey. Never throws — failures are logged and returned so
 * onboarding / unlock can continue.
 *
 * Safe to call repeatedly: returns `already_enabled` when the vault is sealed,
 * and coalesces concurrent callers onto one in-flight run.
 */
export async function ensurePasswordlessRecoverySetup(): Promise<EnsurePasswordlessRecoverySetupResult> {
  if (inFlight) {
    return inFlight;
  }
  inFlight = runEnsurePasswordlessRecoverySetup().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runEnsurePasswordlessRecoverySetup(): Promise<EnsurePasswordlessRecoverySetupResult> {
  const state = ReduxService.store.getState();

  if (!selectMfaRecoveryEnabled(state)) {
    Logger.log('Passwordless recovery setup skipped', { reason: 'flag_off' });
    return { status: 'skipped', reason: 'flag_off' };
  }

  if (!isMfaRecoveryConfigured()) {
    Logger.log('Passwordless recovery setup skipped', {
      reason: 'not_configured',
    });
    return { status: 'skipped', reason: 'not_configured' };
  }

  if (!selectSeedlessOnboardingLoginFlow(state)) {
    Logger.log('Passwordless recovery setup skipped', {
      reason: 'not_seedless',
    });
    return { status: 'skipped', reason: 'not_seedless' };
  }

  const { KeyringController, SeedlessOnboardingController } = Engine.context;
  if (!KeyringController.isUnlocked()) {
    Logger.log('Passwordless recovery setup skipped', { reason: 'locked' });
    return { status: 'skipped', reason: 'locked' };
  }

  if (SeedlessOnboardingController.state.envelope) {
    return { status: 'already_enabled' };
  }

  try {
    const result: PasswordlessRecoverySetupResult =
      await setupPasswordlessRecovery(async () => {
        await verifyOrEnroll({
          methods: ['passkey'],
          verifyWith: 'passkey',
          reason: MFA_SETUP_REASON,
        });
      });

    Logger.log('Passwordless recovery setup finished', { status: result });
    return { status: result };
  } catch (error) {
    const code =
      error instanceof PasswordlessRecoverySetupError
        ? error.detail
          ? `${error.code}: ${error.detail}`
          : error.code
        : getMfaRecoveryErrorCode(error);
    Logger.log('Passwordless recovery setup failed', { code });
    return { status: 'failed', code };
  }
}
