/* eslint-disable no-console */
import React, { useContext } from 'react';
import { Alert } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import Toast from './Toast';
import { ToastContext, ToastContextWrapper } from './Toast.context';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastVariant } from './Toast.types';
import { BaseButtonSize } from '../BaseButton';
import ButtonTertiary, { ButtonTertiaryVariant } from '../ButtonTertiary';

const ToastExample = () => {
  const { toastRef } = useContext(ToastContext);

  return (
    <>
      <ButtonTertiary
        variant={ButtonTertiaryVariant.Normal}
        size={BaseButtonSize.Md}
        label={'Show Account Toast'}
        onPress={() => {
          toastRef?.current?.showToast({
            variant: ToastVariant.Account,
            labelOptions: [
              { label: 'Switching to' },
              { label: ' Account 2.', isBold: true },
            ],
            accountAddress:
              '0x10e08af911f2e489480fb2855b24771745d0198b50f5c55891369844a8c57092',
          });
        }}
      />
      <ButtonTertiary
        variant={ButtonTertiaryVariant.Normal}
        size={BaseButtonSize.Md}
        label={'Show Network Toast'}
        onPress={() => {
          toastRef?.current?.showToast({
            variant: ToastVariant.Network,
            labelOptions: [
              { label: 'Added' },
              { label: ' Mainnet', isBold: true },
              { label: ' network.' },
            ],
            networkImageUrl:
              'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880',
            linkOption: {
              label: 'Click here!',
              onPress: () => {
                Alert.alert('Clicked toast link!');
              },
            },
          });
        }}
      />
      <ButtonTertiary
        variant={ButtonTertiaryVariant.Normal}
        size={BaseButtonSize.Md}
        label={'Show Plain Toast'}
        onPress={() => {
          toastRef?.current?.showToast({
            variant: ToastVariant.Plain,
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
