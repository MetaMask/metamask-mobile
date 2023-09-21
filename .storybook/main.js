module.exports = {
  stories: ['./stories/**/*.stories.?(ts|tsx|js|jsx)'],
  addons: ['@storybook/addon-ondevice-controls'],
  framework: '@storybook/react-native',
  core: {
    builder: 'webpack5',
  },
};
