import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

export function useComponentSize() {
  const [size, setSize] = useState<null | { width: number; height: number }>(
    null,
  );

  // eslint-disable-next-line @typescript-eslint/no-shadow
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    setSize((prev) => {
      // if we already have the same size, do nothing
      if (prev?.width === width && prev?.height === height) {
        return prev;
      }
      // otherwise trigger a re-render with the new size
      return { width, height };
    });
  }, []);

  return { size, onLayout };
}
