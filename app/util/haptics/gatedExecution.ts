import { shouldPlayHaptic, type HapticGateOptions } from './gates';

/**
 * Runs a vendor playback callback only when gates allow; swallows errors so
 * user flows never break on haptic failures.
 */
export async function withGatedPlayback(
  options: HapticGateOptions,
  play: () => Promise<void>,
): Promise<void> {
  if (!shouldPlayHaptic(options)) return;
  try {
    await play();
  } catch {
    // no-op
  }
}
