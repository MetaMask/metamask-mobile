import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;

  return StyleSheet.create({
    // Toast container - positioned at top of screen (highest z-index so it appears above all content)
    container: {
      position: 'absolute',
      top: 74,
      left: 12,
      right: 12,
      zIndex: 100000000000000,
    },
    // Wrapper with default background (close wrap: same edges, radius)
    toastWrapper: {
      borderRadius: 12,
      backgroundColor: colors.background.default,
      padding: 2,
      overflow: 'hidden',
      // Shadow for elevation
      shadowColor: colors.shadow.default,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    // Inner toast content (muted background)
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: colors.background.muted,
    },
    // Icon container
    iconContainer: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Text content container (title + description)
    textContainer: {
      flex: 1,
      gap: 2,
    },
    // Retry button
    retryButton: {
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: colors.background.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
};

export default styleSheet;
