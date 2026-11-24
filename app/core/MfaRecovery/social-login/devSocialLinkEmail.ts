import StorageWrapper from '../../../store/storage-wrapper';
import { isMfaDevBuild } from '../../../util/identity/mfa/isMfaDevBuild';

const DEV_SOCIAL_LINK_EMAIL_STORAGE_KEY = '@MetaMask:mfaDevSocialLinkEmail';

interface DevSocialLinkOverride {
  overrideEmail: string;
  originalEmail?: string;
}

let cachedOverride: DevSocialLinkOverride | undefined;

function parseOverride(raw: string): DevSocialLinkOverride | undefined {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null) {
    return undefined;
  }
  const { overrideEmail, originalEmail } = parsed as Record<string, unknown>;
  if (typeof overrideEmail !== 'string' || overrideEmail.length === 0) {
    return undefined;
  }
  return {
    overrideEmail,
    ...(typeof originalEmail === 'string' && originalEmail.length > 0
      ? { originalEmail }
      : {}),
  };
}

/**
 * Records a dev verifier-replacement email after Auth links it so
 * `MfaRecoveryController` trusts the corresponding social identifier in dev
 * builds. No-op in production and beta builds.
 */
export function setDevSocialLinkEmail(
  overrideEmail: string | undefined,
  originalEmail?: string,
): void {
  const trimmed = overrideEmail?.trim();
  if (!isMfaDevBuild() || !trimmed) {
    return;
  }
  cachedOverride = {
    overrideEmail: trimmed,
    ...(originalEmail ? { originalEmail } : {}),
  };
  void Promise.resolve(
    StorageWrapper.setItem(
      DEV_SOCIAL_LINK_EMAIL_STORAGE_KEY,
      JSON.stringify(cachedOverride),
    ),
  ).catch(() => undefined);
}

/**
 * Loads any persisted dev verifier-replacement email into memory so
 * `MfaRecoveryController` continues to trust it across app restarts in dev
 * builds. No-op in production and beta builds.
 */
export async function hydrateDevSocialLinkEmail(): Promise<void> {
  if (!isMfaDevBuild()) {
    return;
  }
  try {
    const raw = await StorageWrapper.getItem(DEV_SOCIAL_LINK_EMAIL_STORAGE_KEY);
    if (raw) {
      cachedOverride = parseOverride(raw);
    }
  } catch {
    // Ignore malformed or unreadable dev storage.
  }
}

/** Clears the cached dev override (for tests or sign-out). */
export function clearDevSocialLinkEmail(): void {
  cachedOverride = undefined;
  void Promise.resolve(
    StorageWrapper.removeItem(DEV_SOCIAL_LINK_EMAIL_STORAGE_KEY),
  ).catch(() => undefined);
}

/**
 * Applies the dev verifier-replacement email to the seedless controller state
 * seen by `MfaRecoveryController` in dev builds. Returns `state` unchanged in
 * production/beta builds or when no matching override is set.
 */
export function applyDevSocialLinkEmail<
  TState extends { socialLoginEmail?: string },
>(state: TState): TState {
  if (!isMfaDevBuild() || !cachedOverride) {
    return state;
  }
  if (
    cachedOverride.originalEmail !== undefined &&
    state.socialLoginEmail !== undefined &&
    state.socialLoginEmail !== cachedOverride.originalEmail
  ) {
    return state;
  }
  return state.socialLoginEmail === cachedOverride.overrideEmail
    ? state
    : { ...state, socialLoginEmail: cachedOverride.overrideEmail };
}
