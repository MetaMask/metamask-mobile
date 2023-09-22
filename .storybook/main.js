module.exports = {
  stories: [
    '../app/component-library/components/Cards/Card/**/*.stories.?(ts|tsx|js|jsx)',
    '../app/component-library/components/Banners/Banner/variants/BannerAlert/**/*.stories.?(ts|tsx|js|jsx)',
  ],
  addons: ['@storybook/addon-ondevice-controls'],
  framework: '@storybook/react-native',
  core: {
    builder: 'webpack5',
  },
};
