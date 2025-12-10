import { useState, useCallback, useRef, useEffect } from 'react';
import { UNDO_WINDOW_MS } from '../PredictSwipeGame.constants';

interface UndoToastState {
  isVisible: boolean;
  betType: 'yes' | 'no';
  marketTitle: string;
  betAmount: number;
  potentialWin: number;
}

interface UseUndoToastReturn {
  toastState: UndoToastState;
  showToast: (params: Omit<UndoToastState, 'isVisible'>) => void;
  hideToast: () => void;
  handleUndo: () => void;
}

/**
 * Hook to manage the undo toast state and timing
 *
 * Features:
 * - Shows toast when bet is placed
 * - Auto-dismisses after UNDO_WINDOW_MS (5 seconds)
 * - Provides undo callback that goes back to previous card
 */
export function useUndoToast(onUndoAction: () => void): UseUndoToastReturn {
  const [toastState, setToastState] = useState<UndoToastState>({
    isVisible: false,
    betType: 'yes',
    marketTitle: '',
    betAmount: 0,
    potentialWin: 0,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  useEffect(() => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }, []);

  const showToast = useCallback((params: Omit<UndoToastState, 'isVisible'>) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setToastState({
      ...params,
      isVisible: true,
    });

    // Auto-dismiss after countdown
    timeoutRef.current = setTimeout(() => {
      setToastState((prev) => ({ ...prev, isVisible: false }));
    }, UNDO_WINDOW_MS);
  }, []);

  const hideToast = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setToastState((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const handleUndo = useCallback(() => {
    hideToast();
    onUndoAction();
  }, [hideToast, onUndoAction]);

  return {
    toastState,
    showToast,
    hideToast,
    handleUndo,
  };
}

export default useUndoToast;
