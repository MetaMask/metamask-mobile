import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

/**
 * Explore Search stack options.
 * Homepage entry skips the push animation so the measured search-bar handoff
 * can play on its own.
 */
export const getExploreSearchScreenOptions = (
  entryPoint: string | undefined,
  defaultOptions: NativeStackNavigationOptions,
): NativeStackNavigationOptions => ({
  headerShown: false,
  ...(entryPoint === 'home' ? { animation: 'none' } : defaultOptions),
});
