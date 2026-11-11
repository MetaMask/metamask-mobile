import { useCallback, useEffect, useRef, useState } from 'react';

export interface HeldWhileDragging<Value> {
  /** The live value, or the snapshot taken when the drag started. */
  value: Value;
  onDragStart: () => void;
  onDragEnd: () => void;
}

/**
 * Keeps showing the value from when a drag started until it ends, so live
 * price updates don't redraw the chart while the sheet is moving.
 */
export const useHeldWhileDragging = <Value>(
  value: Value,
): HeldWhileDragging<Value> => {
  const latestRef = useRef(value);
  const [held, setHeld] = useState<{ value: Value } | null>(null);

  useEffect(() => {
    latestRef.current = value;
  });

  const onDragStart = useCallback(() => {
    setHeld((current) => current ?? { value: latestRef.current });
  }, []);
  const onDragEnd = useCallback(() => setHeld(null), []);

  return { value: held ? held.value : value, onDragStart, onDragEnd };
};
