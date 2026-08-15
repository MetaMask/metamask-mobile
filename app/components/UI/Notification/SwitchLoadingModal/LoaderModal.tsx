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

  useEffect(() => {
    if (isVisible) {
      closingDueToVisibilityRef.current = false;
      setIsMounted(true);
      return;
    }

    if (isMounted) {
      closingDueToVisibilityRef.current = true;
      sheetRef.current?.onCloseBottomSheet(() => {
        setIsMounted(false);
        closingDueToVisibilityRef.current = false;
      });
    }
  }, [isMounted, isVisible]);

  const handleSheetClosed = useCallback(() => {
    setIsMounted(false);
    if (!closingDueToVisibilityRef.current) {
      onCancel();
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
