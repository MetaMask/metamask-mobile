import { loadAsync } from 'expo-font';
import oswaldMedium from '../fonts/Oswald-Medium.ttf';
import oswaldSemiBold from '../fonts/Oswald-SemiBold.ttf';

/**
 * TEMPORARY prototype — registers Oswald at runtime so Metro / Expo reloads
 * pick up the faces without waiting only on native UIAppFonts.
 */
export const loadOswaldFonts = (): Promise<void> =>
  loadAsync({
    'Oswald-Medium': oswaldMedium,
    'Oswald-SemiBold': oswaldSemiBold,
  });
