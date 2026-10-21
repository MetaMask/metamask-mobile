/**
 * Contract for the performance-test deeplink that starts the measured Hermes
 * window. Kept free of React Native imports so the test helper and the app
 * share one parser.
 *
 * `metamask://e2e/profiler/arm` is handled before the unsupported-link UI.
 * Any other `metamask://e2e/...` URL still falls through to that UI.
 */

export const PROFILER_ARM_DEEPLINK_PREFIX = 'metamask://e2e/profiler/arm';

export type ProfilerArmScope = 'now' | 'next-process';

export interface ProfilerArmRequest {
  nonce: string;
  scope: ProfilerArmScope;
}

export function isProfilerArmDeeplink(uri: string): boolean {
  const path = uri.split('?')[0];
  return path === PROFILER_ARM_DEEPLINK_PREFIX;
}

export function parseProfilerArmDeeplink(
  uri: string,
): ProfilerArmRequest | null {
  if (!isProfilerArmDeeplink(uri)) {
    return null;
  }

  const query = uri.split('?')[1] ?? '';
  const params = new URLSearchParams(query);
  const nonce = params.get('nonce');
  if (!nonce) {
    return null;
  }

  const scope: ProfilerArmScope =
    params.get('scope') === 'next-process' ? 'next-process' : 'now';

  return { nonce, scope };
}

export function buildProfilerArmDeeplink(request: ProfilerArmRequest): string {
  const params = new URLSearchParams({
    nonce: request.nonce,
    scope: request.scope,
  });
  return `${PROFILER_ARM_DEEPLINK_PREFIX}?${params.toString()}`;
}
