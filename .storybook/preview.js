import { ThemeContext, mockTheme } from '../app/util/theme';

export const decorators = [
  // Using a decorator to apply padding for every story
  (StoryFn) => (
    <ThemeContext.Provider value={mockTheme}>
      {<StoryFn />}
    </ThemeContext.Provider>
  ),
];

export const parameters = {
  controls: {},
};
