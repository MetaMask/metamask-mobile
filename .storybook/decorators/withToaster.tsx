import React from 'react';
import { Toaster } from '@metamask/design-system-react-native';

const withToaster = (storyFn: () => React.ReactNode) => (
  <>
    {storyFn()}
    <Toaster />
  </>
);

export default withToaster;
