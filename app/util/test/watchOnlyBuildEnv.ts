// The env vars `isWatchOnlyAccountsBuildEnabled()` reads.
const ENV_KEYS = ['METAMASK_ENVIRONMENT', 'MM_WATCH_ONLY_ACCOUNTS_ENABLED'];

/** Sets the watch-only build gate; the defaults turn it on. */
export const setWatchOnlyBuildEnv = (environment = 'dev', flag = 'true') => {
  process.env.METAMASK_ENVIRONMENT = environment;
  process.env.MM_WATCH_ONLY_ACCOUNTS_ENABLED = flag;
};

/**
 * Turns the watch-only build gate on for each test in the block and restores
 * the original env after. A test may override it with `setWatchOnlyBuildEnv`.
 */
export function withWatchOnlyBuildEnabled() {
  const original = ENV_KEYS.map((key) => [key, process.env[key]] as const);
  beforeEach(() => setWatchOnlyBuildEnv());
  afterEach(() => {
    for (const [key, value] of original) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
}
