export const E2E_MOCK_OAUTH_EXISTING_USER_EMAIL_MARKER = 'existinguser';

export const E2E_MOCK_OAUTH_EXISTING_USER_LAUNCH_ARG =
  'e2eMockOAuthExistingUser';

function isE2EMockOAuthBundle(): boolean {
  return process.env.E2E_MOCK_OAUTH === 'true';
}

let memoryOverride: boolean | null = null;

/**
 * Clears the in-memory override
 */
export function resetE2EMockOAuthExistingUserRuntimeOverride(): void {
  memoryOverride = null;
}

export function setE2EMockOAuthExistingUserRuntimeOverride(
  value: boolean | null,
): void {
  if (!isE2EMockOAuthBundle()) {
    return;
  }
  memoryOverride = value;
}

function readLaunchArgExistingUserTrue(): boolean {
  if (!isE2EMockOAuthBundle()) {
    return false;
  }
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { LaunchArguments } =
      require('react-native-launch-arguments') as typeof import('react-native-launch-arguments');
    /* eslint-enable @typescript-eslint/no-require-imports */
    const raw = LaunchArguments?.value?.() as
      | Record<string, unknown>
      | undefined;
    const v = raw?.[E2E_MOCK_OAUTH_EXISTING_USER_LAUNCH_ARG];
    return v === 'true' || v === true;
  } catch {
    return false;
  }
}

export function isE2EMockOAuthExistingUserScenario(
  emailForHeuristic?: string,
): boolean {
  if (process.env.E2E_MOCK_OAUTH_EXISTING_USER === 'true') {
    return true;
  }
  if (
    typeof emailForHeuristic === 'string' &&
    emailForHeuristic
      .toLowerCase()
      .includes(E2E_MOCK_OAUTH_EXISTING_USER_EMAIL_MARKER)
  ) {
    return true;
  }
  if (!isE2EMockOAuthBundle()) {
    return false;
  }
  if (memoryOverride === true) {
    return true;
  }
  if (memoryOverride === false) {
    return false;
  }
  return readLaunchArgExistingUserTrue();
}
