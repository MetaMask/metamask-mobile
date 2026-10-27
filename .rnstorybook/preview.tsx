import type { Preview } from '@storybook/react-native';

import {
  withMockStore,
  withNavigation,
  withSafeArea,
  withTheme,
  withToaster,
} from './decorators';

const preview: Preview = {
  decorators: [
    withTheme,
    withToaster,
    withSafeArea,
    withNavigation,
    withMockStore,
  ],
  parameters: {
    controls: {},
  },
};

export default preview;
