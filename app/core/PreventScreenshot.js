import {
  allowScreenCaptureAsync,
  preventScreenCaptureAsync,
} from 'expo-screen-capture';
import { isE2EOrExpEnvironment, isRc } from '../util/test/utils';

// Screenshots are how the automated suites capture evidence, so capture
// protection stays off for those builds.
const isCaptureProtectionDisabled = isE2EOrExpEnvironment || isRc;

// A single shared key. Callers manage their own overlapping requests, so the
// key only has to keep this app's requests from clashing with any other
// caller of the module.
const CAPTURE_KEY = 'metamask-credential-screens';

const noop = () => Promise.resolve();

export default {
  /**
   * Blocks screenshots and screen recordings. Android applies FLAG_SECURE,
   * and iOS blocks recordings on 11+ and screenshots on 13+.
   *
   * @returns {Promise<void>}
   */
  forbid: isCaptureProtectionDisabled
    ? noop
    : () => preventScreenCaptureAsync(CAPTURE_KEY),

  /**
   * Releases the block applied by `forbid`.
   *
   * @returns {Promise<void>}
   */
  allow: isCaptureProtectionDisabled
    ? noop
    : () => allowScreenCaptureAsync(CAPTURE_KEY),
};
