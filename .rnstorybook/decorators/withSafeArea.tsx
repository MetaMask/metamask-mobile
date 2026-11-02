import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const withSafeArea = (Story: React.ComponentType) => (
  <SafeAreaProvider>
    <Story />
  </SafeAreaProvider>
);

export default withSafeArea;
