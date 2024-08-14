import React from 'react';
import { Text } from 'react-native';

import Alert from '../types/confirm';

const useBlockaidAlert = (): Alert | undefined => ({
  alertDetails: ['Alert details - 1', 'Alert details - 2'],
  key: 'blockaid',
  component: <Text>report url: www.google.com</Text>,
  isBlocking: true,
  title: 'blockaid alert',
  message: 'Blockaid has reported this request tobe malicious',
  severity: 'danger',
});

export default useBlockaidAlert;
