import React, { type RefObject } from 'react';
import { View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import Toast from './Toast';
import type { ToastOptions, ToastRef } from './Toast.types';

export const STORYBOOK_TOAST_OPTIONS: Pick<ToastOptions, 'hasNoTimeout'> = {
  hasNoTimeout: true,
};

export const presentStoryToast = (
  toastRef: RefObject<ToastRef | null> | undefined,
  options: ToastOptions,
) => {
  toastRef?.current?.showToast({
    ...options,
    hasNoTimeout: true,
  });
};

export const StoryContainer = ({ children }: { children: React.ReactNode }) => {
  const tw = useTailwind();

  return (
    <View style={tw.style('relative min-h-full w-full flex-1 bg-default')}>
      {children}
    </View>
  );
};

export const StoryToastHost = ({
  toastRef,
}: {
  toastRef: RefObject<ToastRef | null> | undefined;
}) => {
  const tw = useTailwind();

  return (
    <View
      pointerEvents="box-none"
      style={tw.style('absolute inset-x-0 top-0 z-50')}
    >
      <Toast ref={toastRef} />
    </View>
  );
};
