import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BottomSheet,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';

export interface LoaderModalProps {
  isVisible: boolean;
  onCancel: () => void;
  children: React.ReactNode;
}

const LoaderModal = (props: LoaderModalProps) => {
  const { isVisible, onCancel, children } = props;
  // Keep mounted while animating closed.
  const [isMounted, setIsMounted] = useState(isVisible);
  const sheetRef = useRef<BottomSheetRef>(null);
  const closingDueToVisibilityRef = useRef(false);
  // Track latest visibility to disambiguate stale close callbacks.
  const isVisibleRef = useRef(isVisible);
  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  useEffect(() => {
    if (isVisible) {
      // Reset programmatic-close marker on explicit reopen.
      closingDueToVisibilityRef.current = false;
      setIsMounted(true);
      // Ensure the sheet is opened in case a previous close finished.
      sheetRef.current?.onOpenBottomSheet();
      return;
    }

    if (isMounted) {
      closingDueToVisibilityRef.current = true;
      sheetRef.current?.onCloseBottomSheet(() => {
        // If visibility flipped back to true while the close was animating,
        // ignore this stale completion to avoid cancel/unmount flicker.
        if (isVisibleRef.current) {
          return;
        }
        setIsMounted(false);
        closingDueToVisibilityRef.current = false;
      });
    }
  }, [isMounted, isVisible]);

  const handleSheetClosed = useCallback(() => {
    // If the parent wants it visible again, ignore this stale close event.
    if (isVisibleRef.current) {
      return;
    }
    setIsMounted(false);
    if (!closingDueToVisibilityRef.current) {
      onCancel();
    } else {
      // Programmatic close finished as intended; reset flag.
      closingDueToVisibilityRef.current = false;
    }
  }, [onCancel]);

  if (!isMounted) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      isInteractable
      onClose={handleSheetClosed}
      keyboardAvoidingViewEnabled
    >
      {/* Children can include their own card/container styling */}
      {children}
    </BottomSheet>
  );
};

export default LoaderModal;
