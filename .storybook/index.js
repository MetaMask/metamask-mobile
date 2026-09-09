import { getStorybookUI } from '@storybook/react-native';

import './storybook.requires';

const StorybookUIRoot = getStorybookUI({
  asyncStorage: null,
  initialSelection:
    'components-ui-accent-colors-gallery--all-accent-components',
});

export { StorybookUIRoot as default };
