/**
 * Must stay aligned with `TOAST_VISIBILITY_DURATION` from
 * `@metamask/design-system-shared` (Toaster auto-dismiss delay after enter spring).
 */
export const TOAST_VISIBILITY_DURATION_MS = 2750;

/**
 * Buffer for Toaster enter/exit springs before unmounting FullWindowOverlay.
 * Slightly late unmount is safe; early unmount would clip the toast.
 */
export const TOAST_OVERLAY_ANIMATION_BUFFER_MS = 1500;

/**
 * Time from showToast (auto-dismiss) until the overlay can unmount.
 * Matches Toaster: spring in → visibility delay → spring out → resetState.
 */
export const TOAST_OVERLAY_AUTO_DISMISS_MS =
  TOAST_VISIBILITY_DURATION_MS + TOAST_OVERLAY_ANIMATION_BUFFER_MS;

export const TOASTER_FULL_WINDOW_OVERLAY_TEST_ID =
  'toaster-full-window-overlay';
