// Third party dependencies
import React from 'react';

// External dependencies
import { useAppTheme, ThemeContext } from '../../../util/theme';
import {
  ThemeProvider as DesignSystemThemeProvider,
  Theme,
} from '@metamask-previews/design-system-twrnc-preset';
import { AppThemeKey } from '../../../util/theme/models';

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const theme = useAppTheme();

  // Convert app theme appearance to design system theme
  const designSystemTheme =
    theme.themeAppearance === AppThemeKey.dark ? Theme.Dark : Theme.Light;

  return (
    <ThemeContext.Provider value={theme}>
      <DesignSystemThemeProvider theme={designSystemTheme}>
        {children}
      </DesignSystemThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;

/**
 * Usage in components:
 *
 * import { useTailwind } from '@metamask-previews/design-system-twrnc-preset';
 *
 * const MyComponent = () => {
 *   const { tw } = useTailwind();
 *
 *   return (
 *     <View style={tw`bg-primary-default p-4 rounded-lg`}>
 *       <Text style={tw`text-text-default font-medium`}>
 *         This text will use design system colors that automatically
 *         switch between light and dark themes!
 *       </Text>
 *     </View>
 *   );
 * };
 */
