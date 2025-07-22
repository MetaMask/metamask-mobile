module.exports = {
  stories: ['../app/**/*.stories.?(ts|tsx|js|jsx)'],
  addons: ['@storybook/addon-ondevice-controls'],
  framework: '@storybook/react-native',
  core: {
    builder: '@storybook/builder-webpack5',
  },
};
