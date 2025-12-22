const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 1000;

/**
 * Lazy import Engine to avoid circular dependencies
 * Engine is only accessed at runtime, not at module load time
 */
const getEngine = () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('../Engine/Engine').default;

/**
 * Check if Engine is initialized
 */
const isEngineReady = (): boolean => {
  try {
    if (getEngine().context) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Wait for Engine to be initialized
 *
 * Uses exponential backoff retry strategy:
 * - Retry 1: 1s delay
 * - Retry 2: 2s delay
 * - Retry 3: 4s delay
 * - Retry 4: 8s delay
 * - Retry 5: 16s delay
 * - After 5 retries, throws an error
 */
export async function whenEngineReady(): Promise<void> {
  if (isEngineReady()) {
    return;
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const delayMs = INITIAL_DELAY_MS * Math.pow(2, attempt);
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    if (isEngineReady()) {
      return;
    }
  }

  throw new Error(`Engine did not become ready after ${MAX_RETRIES} retries`);
}
