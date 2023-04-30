/* eslint-disable no-console */

// Third party dependencies.
import React, { useContext } from 'react';
import { Alert } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// External dependencies.
import Button, { ButtonSize, ButtonVariants } from '../Buttons/Button';

// Internal dependencies.
import Toast from './Toast';
import { ToastContext, ToastContextWrapper } from './Toast.context';
import { ToastVariants } from './Toast.types';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_AVATAR_TYPE,
  TEST_NETWORK_IMAGE_URL,
} from './Toast.constants';

const ToastExample = () => {
  const { toastRef } = useContext(ToastContext);

  return (
    <>
      <Button
        variant={ButtonVariants.Link}
        size={ButtonSize.Md}
        label={'Show Account Toast'}
        onPress={() => {
          toastRef?.current?.showToast({
            variant: ToastVariants.Account,
            labelOptions: [
              { label: 'Switching to' },
              { label: ' Account 2.', isBold: true },
            ],
            accountAddress: TEST_ACCOUNT_ADDRESS,
            accountAvatarType: TEST_AVATAR_TYPE,
          });
        }}
      />
      <Button
        variant={ButtonVariants.Link}
        size={ButtonSize.Md}
        label={'Show Network Toast'}
        onPress={() => {
          toastRef?.current?.showToast({
            variant: ToastVariants.Network,
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
          });
        }}
      />
      <Button
        variant={ButtonVariants.Link}
        size={ButtonSize.Md}
        label={'Show Plain Toast'}
        onPress={() => {
          toastRef?.current?.showToast({
            variant: ToastVariants.Plain,
            labelOptions: [{ label: 'This is a plain message.' }],
          });
        }}
      />

      <Toast ref={toastRef} />
    </>
  );
};

storiesOf('Component Library / Toast', module)
  .addDecorator((storyFn) => (
    <SafeAreaProvider>
      <ToastContextWrapper>{storyFn()}</ToastContextWrapper>
    </SafeAreaProvider>
  ))
  .add('Default', () => <ToastExample />);
