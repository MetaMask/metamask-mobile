module.exports = {
  // Define the location of story files using glob patterns
  stories: [
    '../app/**/*.stories.?(ts|tsx|js|jsx)'
  ],

  // Essential addons for better development experience on mobile devices
  addons: [
    '@storybook/addon-ondevice-controls',
    '@storybook/addon-ondevice-actions',
    '@storybook/addon-ondevice-notes',
    '@storybook/addon-ondevice-backgrounds',
  ],

  // Set the framework specifically for React Native environments
  framework: '@storybook/react-native',

  // Core configuration using Webpack 5 builder for better performance and tree-shaking
  core: {
    builder: '@storybook/builder-webpack5',
  },

  // Additional features to improve interaction and performance
  features: {
    storyStoreV7: true, // Opt-in to the latest story loading mechanism for speed
  },

  // Ensure compatibility with modern JavaScript features in React Native
  typescript: {
    check: false, // Set to true if you want type checking during Storybook builds
  },
};
