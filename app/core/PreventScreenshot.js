import {
  allowScreenCaptureAsync,
  preventScreenCaptureAsync,
} from 'expo-screen-capture';
import { isE2EOrExpEnvironment, isRc } from '../util/test/utils';
import Device from '../util/device';

// Screenshots are how the automated suites capture evidence, so capture
// protection stays off for those builds.
const isCaptureProtectionDisabled = isE2EOrExpEnvironment || isRc;

/**
 * One key per independent owner of the capture block.
 *
 * expo-screen-capture holds these in a Set, not a counter: `prevent` adds the
 * key and only calls the native block if the key is new, while `allow` deletes
 * the key and clears the native block once the Set is empty. Sharing a single
 * key across unrelated owners therefore breaks the moment one of them
 * releases — its `allow` empties the Set and clears FLAG_SECURE for everyone
 * still expecting protection.
 *
 * Distinct keys make that Set behave as a refcount across owners, so the flag
 * survives until the last owner has released it.
 */
export const CAPTURE_KEYS = {
  // Shared by every ScreenshotDeterrent instance, which refcounts its own
  // overlapping mounts internally before calling through to here.
  credentialScreens: 'metamask-credential-screens',
  onboarding: 'metamask-onboarding',
  // Callers that don't pass a key get their own bucket rather than joining an
  // existing owner's, so an unqualified allow() can never release someone
  // else's block. CardScreenshotDeterrent relies on this.
  default: 'metamask-default',
};

const noop = () => Promise.resolve();

// expo-screen-capture's iOS implementation blanks the entire window, not just
// the sensitive content, so the whole screen goes black and the rest of the
// UI stops being usable for the duration of the capture. That's the right
// trade-off on Android, which has no per-view alternative, but on iOS
// SecureContentView already masks the specific secret while leaving
// everything else on screen interactive, so this whole-window block would
// only make the experience worse there without protecting anything more.
const isWholeWindowBlockSupported = Device.isAndroid();

const isDisabled = isCaptureProtectionDisabled || !isWholeWindowBlockSupported;

export default {
  /**
   * Blocks screenshots and screen recordings via FLAG_SECURE. Android only —
   * see isWholeWindowBlockSupported above for why iOS opts out.
   *
   * @param {string} key Owner key from CAPTURE_KEYS. Owners must not share a
   * key unless they coordinate their own refcount — see CAPTURE_KEYS.
   * @returns {Promise<void>}
   */
  forbid: isDisabled
    ? noop
    : (key = CAPTURE_KEYS.default) => preventScreenCaptureAsync(key),

  /**
   * Releases this owner's block. The native flag is only cleared once every
   * other owner has released theirs too.
   *
   * @param {string} key The same key passed to `forbid`.
   * @returns {Promise<void>}
   */
  allow: isDisabled
    ? noop
    : (key = CAPTURE_KEYS.default) => allowScreenCaptureAsync(key),
};
