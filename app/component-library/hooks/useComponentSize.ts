/* eslint-disable import/prefer-default-export */
import { useCallback, useRef } from 'react';
import { LayoutChangeEvent } from 'react-native';

export const useComponentSize = () => {
  const sizeRef = useRef<null | { width: number; height: number }>(null);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    sizeRef.current = { width, height };
  }, []);
  return { size: sizeRef.current, onLayout };
};
