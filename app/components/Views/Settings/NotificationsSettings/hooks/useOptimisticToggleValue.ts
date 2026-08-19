import { useCallback, useEffect, useRef, useState } from 'react';

interface UseOptimisticToggleValueParams {
  remoteValue: boolean;
  onPersist: (nextValue: boolean) => Promise<void>;
  isToggleEnabled?: (nextValue: boolean) => boolean;
  onToggleBlocked?: (nextValue: boolean) => void;
}

export interface UseOptimisticToggleValueResult {
  value: boolean;
  onValueChange: (nextValue: boolean) => void;
  pendingWrites: number;
}

export const useOptimisticToggleValue = ({
  remoteValue,
  onPersist,
  isToggleEnabled,
  onToggleBlocked,
}: UseOptimisticToggleValueParams): UseOptimisticToggleValueResult => {
  const [overlayValue, setOverlayValue] = useState<boolean | undefined>(
    undefined,
  );
  const [pendingWrites, setPendingWrites] = useState(0);

  const displayedValue = overlayValue ?? remoteValue;
  const writeChainRef = useRef<Promise<void>>(Promise.resolve());
  const generationRef = useRef(0);
  const displayedValueRef = useRef(displayedValue);
  displayedValueRef.current = displayedValue;
  const remoteValueRef = useRef(remoteValue);
  remoteValueRef.current = remoteValue;

  const enqueuePersist = useCallback(
    (nextValue: boolean) => {
      const next = writeChainRef.current.then(() => onPersist(nextValue));
      // Keep the queue alive even if one mutation fails.
      writeChainRef.current = next.catch(() => undefined);
      return next;
    },
    [onPersist],
  );

  useEffect(() => {
    if (
      overlayValue !== undefined &&
      pendingWrites === 0 &&
      overlayValue === remoteValue
    ) {
      setOverlayValue(undefined);
    }
  }, [overlayValue, pendingWrites, remoteValue]);

  const onValueChange = useCallback(
    (nextValue: boolean) => {
      if (nextValue === displayedValueRef.current) {
        return;
      }

      if (isToggleEnabled && !isToggleEnabled(nextValue)) {
        onToggleBlocked?.(nextValue);
        return;
      }

      generationRef.current += 1;
      const writeGeneration = generationRef.current;
      displayedValueRef.current = nextValue;
      setOverlayValue(nextValue);
      setPendingWrites((count) => count + 1);

      enqueuePersist(nextValue)
        .catch(() => {
          // Roll back only if no newer mutation has been queued.
          if (generationRef.current === writeGeneration) {
            displayedValueRef.current = remoteValueRef.current;
            setOverlayValue(undefined);
          }
        })
        .finally(() => {
          setPendingWrites((count) => Math.max(0, count - 1));
        });
    },
    [enqueuePersist, isToggleEnabled, onToggleBlocked],
  );

  return {
    value: displayedValue,
    onValueChange,
    pendingWrites,
  };
};
