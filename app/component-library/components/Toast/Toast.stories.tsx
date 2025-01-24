/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/display-name */
// Third party dependencies.
import React, { useContext } from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// External dependencies.
import Button, { ButtonVariants } from '../Buttons/Button';

// Internal dependencies.
import { default as ToastComponent } from './Toast';
import { ToastContext, ToastContextWrapper } from './Toast.context';
import { ToastVariants } from './Toast.types';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_AVATAR_TYPE,
  TEST_NETWORK_IMAGE_URL,
} from './Toast.constants';

const ToastMeta = {
  title: 'Component Library / Toast',
  component: ToastComponent,
  decorators: [
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Story: any) => (
      <SafeAreaProvider>
        <ToastContextWrapper>
          <Story />
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
};
export default ToastMeta;

export const Toast = {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { toastRef } = useContext(ToastContext);
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let otherToastProps: any;

    switch (args.variant) {
      case ToastVariants.Plain:
        otherToastProps = {
          labelOptions: [{ label: 'This is a Toast message.' }],
        };
        break;
      case ToastVariants.Account:
        otherToastProps = {
          labelOptions: [
            { label: 'Switching to' },
            { label: ' Account 2.', isBold: true },
          ],
          accountAddress: TEST_ACCOUNT_ADDRESS,
          accountAvatarType: TEST_AVATAR_TYPE,
        };
        break;
      case ToastVariants.Network:
        otherToastProps = {
          labelOptions: [
            { label: 'Added' },
            { label: ' Mainnet', isBold: true },
            { label: ' network.' },
          ],
          networkImageSource: { uri: TEST_NETWORK_IMAGE_URL },
          linkButtonOptions: {
            label: 'Click here!',
            onPress: () => {
              Alert.alert('Clicked toast link!');
            },
          },
        };
        break;
      default:
        otherToastProps = {
          labelOptions: [{ label: 'This is a Toast message.' }],
        };
    }

    return (
      <>
        <Button
          variant={ButtonVariants.Secondary}
          label={`Show ${args.variant} Toast`}
          onPress={() => {
            toastRef?.current?.showToast({
              variant: args.variant,
              ...otherToastProps,
            });
          }}
        />
        <ToastComponent ref={toastRef} />
      </>
    );
  },
};
