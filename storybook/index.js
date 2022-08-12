import React from 'react';
import {
  getStorybookUI,
  configure,
  addDecorator,
} from '@storybook/react-native';
import { withKnobs } from '@storybook/addon-knobs';
import { ThemeContext, mockTheme } from '../app/util/theme';
import { withNavigation, withSafeArea } from './decorators';
import { loadStories } from './storyLoader';
import './rn-addons';

// enables knobs for all stories
addDecorator(withKnobs);
// enables theme for all stories - TODO - make theme dynamic instead of mocked
addDecorator((storyFn) => (
  <ThemeContext.Provider value={mockTheme}>{storyFn()}</ThemeContext.Provider>
));
// Expose navigation to all safe area provider
addDecorator(withSafeArea);
// Expose navigation to all stories
addDecorator(withNavigation);

// import stories locally and from the
// react-native-storybook-loader auto generated file
configure(() => {
  require('./GettingStarted.stories');
  loadStories();
}, module);

// Refer to https://github.com/storybookjs/storybook/tree/master/app/react-native#start-command-parameters
// To find allowed options for getStorybookUI
const StorybookUIRoot = getStorybookUI({
  asyncStorage: null,
});

export default StorybookUIRoot;
