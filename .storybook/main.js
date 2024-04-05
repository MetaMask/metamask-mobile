module.exports = {
  stories: [
    '../app/component-library/components/**/*.stories.?(ts|tsx|js|jsx)',
    '../app/component-library/components-temp/TagColored/**/*.stories.?(ts|tsx|js|jsx)',
  ],
  addons: ['@storybook/addon-ondevice-controls'],
  framework: '@storybook/react-native',
  core: {
    builder: '@storybook/builder-webpack5',
  },
};
