import { getStorybookUI } from '@storybook/react-native';

import './storybook.requires';

const StorybookUIRoot = getStorybookUI({
  asyncStorage: null,
});

export { StorybookUIRoot as default };
