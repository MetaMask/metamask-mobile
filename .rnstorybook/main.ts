import type { StorybookConfig } from '@storybook/react-native';

const main: StorybookConfig = {
  stories: ['../app/**/*.stories.?(ts|tsx|js|jsx)'],
  deviceAddons: [
    '@storybook/addon-ondevice-controls',
    '@storybook/addon-ondevice-actions',
    '@storybook/addon-ondevice-backgrounds',
    '@storybook/addon-ondevice-notes',
  ],
  framework: '@storybook/react-native',
};

export default main;
