import React, { useLayoutEffect, useRef, useState } from 'react';
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
 * `unstable_accessibilityContainerViewIsModal={false}` retains the DSYS-931
 * fix so an active overlay does not hide the app AX tree.
 */
const ToasterOverlay = () => {
  const toasterRef = useRef<ToasterRef>(null);
  const pendingToastRef = useRef<ToastOptions | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldShowOverlayRef = useRef(false);
  const [shouldShowOverlay, setShouldShowOverlay] = useState(false);

  shouldShowOverlayRef.current = shouldShowOverlay;

  const clearHideTimer = () => {
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const scheduleOverlayHide = (delayMs: number) => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      setShouldShowOverlay(false);
    }, delayMs);
  };

  // Re-wrap every commit: Toaster replaces imperative methods each render.
  useLayoutEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    const api = toasterRef.current;
    if (!api) {
      return;
    }

    const originalShowToast = api.showToast;
    const originalCloseToast = api.closeToast;

    api.showToast = (options: ToastOptions) => {
      clearHideTimer();

      if (!shouldShowOverlayRef.current) {
        pendingToastRef.current = options;
        setShouldShowOverlay(true);
        return;
      }

      originalShowToast(options);

      if (!options.hasNoTimeout) {
        scheduleOverlayHide(TOAST_OVERLAY_AUTO_DISMISS_MS);
      }
    };

    api.closeToast = () => {
      clearHideTimer();
      originalCloseToast();
      scheduleOverlayHide(TOAST_OVERLAY_ANIMATION_BUFFER_MS);
    };
  });

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

  useLayoutEffect(
    () => () => {
      clearHideTimer();
    },
    [],
  );

  if (Platform.OS !== 'ios') {
    return <Toaster />;
  }

  const toaster = <Toaster ref={toasterRef} />;

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
