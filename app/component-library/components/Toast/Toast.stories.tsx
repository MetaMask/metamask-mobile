// Third party dependencies.
import React, { useContext } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Meta } from '@storybook/react-native';

// External dependencies.
import Button, { ButtonVariants } from '../Buttons/Button';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

// Internal dependencies.
import { default as ToastComponent } from './Toast';
import { ToastContext, ToastContextWrapper } from './Toast.context';
import { ToastOptions, ToastVariants } from './Toast.types';

export default {
  title: 'Component Library / Toast',
  component: ToastComponent,
  decorators: [
    (StoryComponent) => (
      <SafeAreaProvider>
        <ToastContextWrapper>
          <StoryComponent />
        </ToastContextWrapper>
      </SafeAreaProvider>
    ),
  ],
} as Meta;

export const Default = {
  render: function Render() {
    const { toastRef } = useContext(ToastContext);
    const tw = useTailwind();

    const toastOptions: ToastOptions = {
      variant: ToastVariants.Plain,
      hasNoTimeout: false,
      labelOptions: [{ label: 'This is a Toast message.' }],
    };

    return (
      <View style={tw.style('min-h-[300px] relative')}>
        <Button
          variant={ButtonVariants.Secondary}
          label="Show Toast"
          onPress={() => {
            toastRef?.current?.showToast(toastOptions);
          }}
        />
        <ToastComponent ref={toastRef} />
      </View>
    );
  },
};
