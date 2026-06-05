import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ForwardedRef,
} from 'react';
import type { BottomSheetRef } from '../../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet.types';

export interface ControllableBottomSheetRef {
  onOpenBottomSheet: () => void;
  onCloseBottomSheet: () => void;
}

interface UseControllableBottomSheetArgs {
  ref: ForwardedRef<ControllableBottomSheetRef>;
  onDismiss?: () => void;
}

/**
 * Encapsulates the shared scaffolding for imperative-ref–controlled bottom
 * sheets: visibility state, open/close logic, and the useImperativeHandle
 * binding. Each consumer only needs to declare its own content.
 */
export const useControllableBottomSheet = ({
  ref,
  onDismiss,
}: UseControllableBottomSheetArgs) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isVisible, setIsVisible] = useState(false);

  const handleSheetClosed = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  const closeSheet = useCallback(() => {
    if (!sheetRef.current) {
      setIsVisible(false);
      onDismiss?.();
      return;
    }
    sheetRef.current.onCloseBottomSheet(() => {
      setIsVisible(false);
    });
  }, [onDismiss]);

  useImperativeHandle(
    ref,
    () => ({
      onOpenBottomSheet: () => {
        if (!isVisible) {
          setIsVisible(true);
          return;
        }
        sheetRef.current?.onOpenBottomSheet();
      },
      onCloseBottomSheet: closeSheet,
    }),
    [closeSheet, isVisible],
  );

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  return { sheetRef, isVisible, closeSheet, handleSheetClosed };
};
