import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const ACCOUNT_SELECTOR_VERTICAL_PADDING = 12;
const BOTTOM_BLOCK_GAP = 16;
const BOTTOM_BLOCK_PADDING = 16;

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
    },

    inputContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 14,
    },

    // Sits on top of the safe-area inset, so the confirm button and the keypad
    // keep clear of the home indicator / navigation bar on both platforms.
    bottomBlock: {
      paddingBottom: BOTTOM_BLOCK_PADDING,
    },

    disabledButton: {
      opacity: 0.5,
    },

    footerText: {
      alignSelf: 'center',
    },

    separator: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
      marginBottom: ACCOUNT_SELECTOR_VERTICAL_PADDING - BOTTOM_BLOCK_GAP,
    },

    buttonSkeleton: {
      borderRadius: 999,
      marginTop: 16,
    },

    skeletonRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingVertical: 12,
      paddingHorizontal: 8,
    },

    skeletonInfoRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingBottom: 10,
      paddingHorizontal: 8,
    },

    skeletonRowRight: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
  });
};

export default styleSheet;
