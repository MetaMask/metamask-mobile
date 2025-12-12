// Third party dependencies.
import React, { useContext } from 'react';
import { Alert, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Meta } from '@storybook/react-native';

// External dependencies.
import Button, { ButtonVariants } from '../Buttons/Button';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

// Internal dependencies.
import { default as ToastComponent } from './Toast';
import { ToastContext, ToastContextWrapper } from './Toast.context';
import { ToastOptions, ToastVariants } from './Toast.types';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_AVATAR_TYPE,
  TEST_NETWORK_IMAGE_URL,
} from './Toast.constants';

interface ToastStoryArgs {
  variant: ToastVariants;
}

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
  argTypes: {
    variant: {
      options: ToastVariants,
      control: {
        type: 'select',
      },
      defaultValue: ToastVariants.Plain,
    },
  },
} as Meta;

export const Default = {
  args: {
    variant: ToastVariants.Plain,
  },
  render: function Render(args: ToastStoryArgs) {
    const { toastRef } = useContext(ToastContext);
    const tw = useTailwind();

    let toastOptions: ToastOptions;

    switch (args.variant) {
      case ToastVariants.Plain:
        toastOptions = {
          variant: ToastVariants.Plain,
          hasNoTimeout: false,
          labelOptions: [{ label: 'This is a Toast message.' }],
        };
        break;
      case ToastVariants.Account:
        toastOptions = {
          variant: ToastVariants.Account,
          hasNoTimeout: false,
          labelOptions: [
            { label: 'Switching to' },
            { label: ' Account 2.', isBold: true },
          ],
          accountAddress: TEST_ACCOUNT_ADDRESS,
          accountAvatarType: TEST_AVATAR_TYPE,
        };
        break;
      case ToastVariants.Network:
        toastOptions = {
          variant: ToastVariants.Network,
          hasNoTimeout: false,
          labelOptions: [
            { label: 'Added' },
            { label: ' Mainnet', isBold: true },
            { label: ' network.' },
          ],
          networkImageSource: { uri: TEST_NETWORK_IMAGE_URL },
          descriptionOptions: {
            description: 'This is a description text for the network toast.',
          },
          linkButtonOptions: {
            label: 'Click here!',
            onPress: () => {
              Alert.alert('Clicked toast link!');
            },
          },
        };
        break;
      default:
        toastOptions = {
          variant: ToastVariants.Plain,
          hasNoTimeout: false,
          labelOptions: [{ label: 'This is a Toast message.' }],
        };
    }

    return (
      <View style={tw.style('min-h-[300px] relative')}>
        <Button
          variant={ButtonVariants.Secondary}
          label={`Show ${args.variant} Toast`}
          onPress={() => {
            toastRef?.current?.showToast(toastOptions);
          }}
        />
        <ToastComponent ref={toastRef} />
      </View>
    );
  },
};
