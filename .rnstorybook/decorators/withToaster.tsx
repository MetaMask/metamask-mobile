import React from 'react';
import { Toaster } from '@metamask/design-system-react-native';

const withToaster = (Story: React.ComponentType) => (
  <>
    <Story />
    <Toaster />
  </>
);

export default withToaster;
