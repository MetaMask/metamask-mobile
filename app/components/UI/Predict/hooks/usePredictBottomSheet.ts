import { useCallback, useEffect, useRef, useState } from 'react';
import { BottomSheetRef } from '../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet.types';

interface UsePredictBottomSheetParams {
  onDismiss?: () => void;
}

export interface PredictBottomSheetRef {
  onOpenBottomSheet: () => void;
  onCloseBottomSheet: () => void;
}

export function usePredictBottomSheet(params?: UsePredictBottomSheetParams) {
  const { onDismiss } = params || {};
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isVisible, setIsVisible] = useState(false);

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

  const handleSheetClosed = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  const getRefHandlers = useCallback(
    (): PredictBottomSheetRef => ({
      onOpenBottomSheet: () => {
        if (!isVisible) {
          setIsVisible(true);
          return;
        }

        sheetRef.current?.onOpenBottomSheet();
      },
      onCloseBottomSheet: () => {
        closeSheet();
      },
    }),
    [closeSheet, isVisible],
  );

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  return {
    sheetRef,
    isVisible,
    closeSheet,
    handleSheetClosed,
    getRefHandlers,
  };
}
