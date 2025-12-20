import { isE2E } from '../../util/test/utils';

/**
 * This is the frequency of batch flushing in milliseconds
 * delay of 0 means "flush on the next macrotask"
 *
 * During E2E tests, we use 0ms to prevent pending timers that cause
 * Detox synchronization issues.
 */
export const DEFAULT_BATCH_FLUSH_TIMER = isE2E ? 0 : 250;
