import { ThemeContext, mockTheme } from '../app/util/theme';
import { withNavigation, withSafeArea } from './decorators';

export const decorators = [
  // Using a decorator to apply padding for every story
  (StoryFn) => (
    <ThemeContext.Provider value={mockTheme}>
      {<StoryFn />}
    </ThemeContext.Provider>
  ),
  withSafeArea,
  withNavigation,
];

export const parameters = {
  controls: {},
};
