import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoryFn } from '@storybook/react-native';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const withSafeArea = (story: StoryFn) => (
  <SafeAreaProvider>{story()}</SafeAreaProvider>
);

export default withSafeArea;
