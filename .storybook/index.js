import React, { useEffect } from 'react';
import { getStorybookUI } from '@storybook/react-native';
import { hideAsync } from 'expo-splash-screen';

import './storybook.requires';

const StorybookUI = getStorybookUI({
  asyncStorage: null,
});

const StorybookUIRoot = () => {
  useEffect(() => {
    hideAsync().catch(() => {
      // Non-fatal when splash is unavailable in dev.
    });
  }, []);

  return <StorybookUI />;
};

export { StorybookUIRoot as default };
