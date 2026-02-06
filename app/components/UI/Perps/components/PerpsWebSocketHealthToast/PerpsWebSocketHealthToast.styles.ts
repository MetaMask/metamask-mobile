import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;

  return StyleSheet.create({
    // Toast container - positioned at top of screen
    container: {
      position: 'absolute',
      top: 74,
      left: 12,
      right: 12,
      zIndex: 9999,
    },
    // Inner toast content
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.background.default,
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
