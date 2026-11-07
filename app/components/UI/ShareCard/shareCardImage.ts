import {
  AppState,
  Platform,
  type NativeEventSubscription,
  type View,
} from 'react-native';
import Share from 'react-native-share';
import { captureRef } from 'react-native-view-shot';

/** Exported image edge in pixels, whatever the preview size on screen. */
export const SHARE_CARD_IMAGE_SIZE = 1080;

/** How long to wait for the Android chooser to take over the screen. */
export const ANDROID_CHOOSER_OPEN_TIMEOUT_MS = 3000;

/**
 * `shared` and `dismissed` come from the share sheet. `unknown` means the
 * sheet closed without telling us which, which is what Android does.
 */
export type ShareCardShareOutcome = 'shared' | 'dismissed' | 'unknown';

export interface ShareCardImageOptions {
  /** Text sent alongside the image, e.g. a deeplink. */
  message?: string;
}

/**
 * Resolves once the app is back in the foreground after the chooser took it
 * over, or after a timeout if the chooser never took over.
 */
const waitForReturnFromChooser = (): Promise<'unknown'> =>
  new Promise((resolve) => {
    let hasLeftApp = false;
    const handles: {
      openTimeout?: ReturnType<typeof setTimeout>;
      subscription?: NativeEventSubscription;
    } = {};
    const finish = () => {
      clearTimeout(handles.openTimeout);
      handles.subscription?.remove();
      resolve('unknown');
    };
    handles.subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        hasLeftApp = true;
        clearTimeout(handles.openTimeout);
      } else if (hasLeftApp) {
        finish();
      }
    });
    handles.openTimeout = setTimeout(() => {
      if (!hasLeftApp) finish();
    }, ANDROID_CHOOSER_OPEN_TIMEOUT_MS);
  });

/**
 * Captures the card as a PNG and opens the native share sheet with it.
 *
 * On Android the patched `react-native-share` opens the chooser with
 * `startActivity`, so its promise does not settle on dismiss and may not
 * settle after a share either. The share ends when the user returns to the
 * app instead, with an `unknown` outcome.
 */
export async function shareShareCardImage(
  card: View,
  { message }: ShareCardImageOptions = {},
): Promise<ShareCardShareOutcome> {
  const fileUri = await captureRef(card, {
    format: 'png',
    quality: 1,
    width: SHARE_CARD_IMAGE_SIZE,
    height: SHARE_CARD_IMAGE_SIZE,
    result: 'tmpfile',
  });
  const sharing = Share.open({
    url: fileUri,
    // Instagram and other image targets need the MIME type to accept the file.
    type: 'image/png',
    ...(message ? { message } : {}),
    failOnCancel: false,
  }).then(
    (result): ShareCardShareOutcome =>
      result.success === true && result.dismissedAction !== true
        ? 'shared'
        : 'dismissed',
  );

  if (Platform.OS !== 'android') {
    return sharing;
  }
  return Promise.race([sharing, waitForReturnFromChooser()]);
}
