import { TamaguiProvider } from 'tamagui';
import { ThemeContext, mockTheme } from '../app/util/theme';
import { withNavigation, withSafeArea } from './decorators';
import tamaguiConfig from '../tamagui.config';

export const decorators = [
  // Using a decorator to apply padding for every story
  (StoryFn) => (
    <ThemeContext.Provider value={mockTheme}>
      <TamaguiProvider config={tamaguiConfig}>
        <StoryFn />
      </TamaguiProvider>
    </ThemeContext.Provider>
  ),
  withSafeArea,
  withNavigation,
];

export const parameters = {
  controls: {},
};

