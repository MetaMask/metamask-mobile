/* eslint-disable import/prefer-default-export */
import { useCallback, useState } from 'react';
import { LayoutChangeEvent } from 'react-native';

export const useComponentSize = () => {
  const [size, setSize] = useState<null | { width: number; height: number }>(
    null,
  );
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);
  return { size, onLayout };
};
