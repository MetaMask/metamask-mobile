import React, { useEffect } from 'react';
import { getStorybookUI } from '@storybook/react-native';
import { hideAsync } from 'expo-splash-screen';

import './storybook.requires';

const StorybookUIRoot = getStorybookUI({
  asyncStorage: null,
});

function StorybookRoot() {
  useEffect(() => {
    hideAsync().catch(() => {
      // Non-fatal — Storybook can still render if splash hide fails
    });
  }, []);

  return <StorybookUIRoot />;
}

export { StorybookRoot as default };
