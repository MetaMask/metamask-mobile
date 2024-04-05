/* eslint-disable import/prefer-default-export */
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const withSafeArea = (story: any) => (
  <SafeAreaProvider>{story()}</SafeAreaProvider>
);

export default withSafeArea;
