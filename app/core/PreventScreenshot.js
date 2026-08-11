import {
  allowScreenCaptureAsync,
  preventScreenCaptureAsync,
} from 'expo-screen-capture';
import { isE2EOrExpEnvironment, isRc } from '../util/test/utils';
import Device from '../util/device';

// Screenshots are how the automated suites capture evidence, so capture
// protection stays off for those builds.
const isCaptureProtectionDisabled = isE2EOrExpEnvironment || isRc;

// A single shared key. Callers manage their own overlapping requests, so the
// key only has to keep this app's requests from clashing with any other
// caller of the module.
const CAPTURE_KEY = 'metamask-credential-screens';

const noop = () => Promise.resolve();

// expo-screen-capture's iOS implementation blanks the entire window, not just
// the sensitive content, so the whole screen goes black and the rest of the
// UI stops being usable for the duration of the capture. That's the right
// trade-off on Android, which has no per-view alternative, but on iOS
// SecureContentView already masks the specific secret while leaving
// everything else on screen interactive, so this whole-window block would
// only make the experience worse there without protecting anything more.
const isWholeWindowBlockSupported = Device.isAndroid();

export default {
  /**
   * Blocks screenshots and screen recordings via FLAG_SECURE. Android only —
   * see isWholeWindowBlockSupported above for why iOS opts out.
   *
   * @returns {Promise<void>}
   */
  forbid:
    isCaptureProtectionDisabled || !isWholeWindowBlockSupported
      ? noop
      : () => preventScreenCaptureAsync(CAPTURE_KEY),

  /**
   * Releases the block applied by `forbid`.
   *
   * @returns {Promise<void>}
   */
  allow:
    isCaptureProtectionDisabled || !isWholeWindowBlockSupported
      ? noop
      : () => allowScreenCaptureAsync(CAPTURE_KEY),
};
