import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  Toaster,
  type ToastOptions,
  type ToasterRef,
} from '@metamask/design-system-react-native';
import { FullWindowOverlay } from 'react-native-screens';

import {
  TOAST_OVERLAY_ANIMATION_BUFFER_MS,
  TOAST_OVERLAY_AUTO_DISMISS_MS,
} from './ToasterOverlay.constants';

/**
 * Hosts design-system `<Toaster />` and mounts iOS `FullWindowOverlay` only
 * while a toast is active.
 *
 * Idle `FullWindowOverlay` still creates a native `RNSFullWindowOverlay` /
 * `UIWindow` even when Toaster returns null. Conditional mounting removes that
 * idle window (same pattern as HardwareWalletProvider / #32973).
 *
 * Toaster must remount when the overlay wrapper appears, so the first
 * `showToast` is deferred until after overlay mount. The global `toast()` API
 * keeps working because Toaster re-registers on mount.
 *
 * `Toaster` replaces its imperative handle object on every render. A callback
 * ref re-wraps `showToast` / `closeToast` whenever that handle is published so
 * overlay scheduling cannot be dropped after an independent Toaster re-render.
 *
 * Close-button dismiss calls Toaster's internal `closeToast` (not the patched
 * handle). We also wrap `options.onClose` so overlay teardown still runs after
 * that path. Swipe-to-dismiss has the same internal gap; timed toasts already
 * schedule teardown on show.
 *
 * `unstable_accessibilityContainerViewIsModal={false}` retains the DSYS-931
 * fix so an active overlay does not hide the app AX tree.
 */
const ToasterOverlay = () => {
  const toasterRef = useRef<ToasterRef | null>(null);
  const originalsRef = useRef<ToasterRef | null>(null);
  const pendingToastRef = useRef<ToastOptions | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldShowOverlayRef = useRef(false);
  const [shouldShowOverlay, setShouldShowOverlay] = useState(false);

  shouldShowOverlayRef.current = shouldShowOverlay;

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleOverlayHide = useCallback(
    (delayMs: number) => {
      clearHideTimer();
      hideTimerRef.current = setTimeout(() => {
        hideTimerRef.current = null;
        setShouldShowOverlay(false);
      }, delayMs);
    },
    [clearHideTimer],
  );

  // Callback ref: Toaster's useImperativeHandle publishes a fresh handle object
  // every render. Re-wrap here so patches survive Toaster-only re-renders.
  const toasterRefCallback = useCallback(
    (api: ToasterRef | null) => {
      if (api == null) {
        toasterRef.current = null;
        originalsRef.current = null;
        return;
      }

      originalsRef.current = {
        showToast: api.showToast,
        closeToast: api.closeToast,
      };

      if (Platform.OS === 'ios') {
        api.showToast = (options: ToastOptions) => {
          clearHideTimer();

          if (!shouldShowOverlayRef.current) {
            pendingToastRef.current = options;
            setShouldShowOverlay(true);
            return;
          }

          const userOnClose = options.onClose;
          // Toaster's close button invokes options.onClose after its internal
          // dismiss — not the patched handle closeToast. Schedule overlay hide
          // here so hasNoTimeout toasts still tear down FullWindowOverlay.
          originalsRef.current?.showToast({
            ...options,
            onClose: () => {
              userOnClose?.();
              scheduleOverlayHide(TOAST_OVERLAY_ANIMATION_BUFFER_MS);
            },
          });

          if (!options.hasNoTimeout) {
            scheduleOverlayHide(TOAST_OVERLAY_AUTO_DISMISS_MS);
          }
        };

        api.closeToast = () => {
          clearHideTimer();
          originalsRef.current?.closeToast();
          scheduleOverlayHide(TOAST_OVERLAY_ANIMATION_BUFFER_MS);
        };
      }

      toasterRef.current = api;
    },
    [clearHideTimer, scheduleOverlayHide],
  );

  // After overlay + Toaster remount, flush the deferred toast.
  useLayoutEffect(() => {
    if (Platform.OS !== 'ios' || !shouldShowOverlay) {
      return;
    }

    const pending = pendingToastRef.current;
    if (!pending || !toasterRef.current) {
      return;
    }

    pendingToastRef.current = null;
    toasterRef.current.showToast(pending);
  }, [shouldShowOverlay]);

  useLayoutEffect(() => () => clearHideTimer(), [clearHideTimer]);

  if (Platform.OS !== 'ios') {
    return <Toaster />;
  }

  const toaster = <Toaster ref={toasterRefCallback} />;

  if (!shouldShowOverlay) {
    return toaster;
  }

  return (
    <FullWindowOverlay unstable_accessibilityContainerViewIsModal={false}>
      {toaster}
    </FullWindowOverlay>
  );
};

export default ToasterOverlay;
