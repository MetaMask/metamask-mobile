module.exports = {
  stories: [
    '../app/component-library/components/**/*.stories.?(ts|tsx|js|jsx)',
    '../app/component-library/base-components/**/*.stories.?(ts|tsx|js|jsx)',
    '../app/component-library/components-temp/**/*.stories.?(ts|tsx|js|jsx)',
  ],
  addons: ['@storybook/addon-ondevice-controls'],
  framework: '@storybook/react-native',
  core: {
    builder: '@storybook/builder-webpack5',
  },
};
