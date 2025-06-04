// External dependencies
import { useTailwind } from '@metamask-previews/design-system-twrnc-preset';
import { useTheme } from '../util/theme';

/**
 * Custom hook that provides access to both MetaMask design tokens and TWRNC utilities
 * @returns Object containing both theme and tailwind utilities
 */
export const useTwrncTheme = () => {
  const theme = useTheme();
  const tw = useTailwind();

  return {
    theme,
    tw,
  };
};
