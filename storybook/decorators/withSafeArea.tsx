/* eslint-disable import/prefer-default-export */
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const withSafeArea = (story: any) => (
  <SafeAreaProvider>{story()}</SafeAreaProvider>
);

export default withSafeArea;
