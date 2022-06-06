/* eslint-disable no-console */
import React, { useEffect } from 'react';
import { storiesOf } from '@storybook/react-native';
import Toast from './Toast';

const ToastWrapper = () => {
  useEffect(() => {
    Toast.showWarningToast({
      title: 'Security Warning',
      message:
        'Your Android System Webview is out of date and may leave you open to security risks.',
      actionText: 'Update on Play Store',
      action: () => console.log('LOG'),
    });
  }, []);

  return <Toast />;
};

storiesOf('Component Library / Toast', module)
  .addDecorator((getStory) => getStory())
  .add('Warning', () => <ToastWrapper />);
