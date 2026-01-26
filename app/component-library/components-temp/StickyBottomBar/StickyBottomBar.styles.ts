import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.background.default,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
      paddingTop: 16,
      paddingHorizontal: 16,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12, // 12px between buttons
      alignItems: 'stretch', // Stretch to match button height
      justifyContent: 'space-between',
    },
    buttonWrapper: {
      flex: 1, // flex: 1 0 0 from design (equal width buttons)
      flexShrink: 0,
      flexBasis: 0,
      minWidth: 0, // Allow flex to work properly
    },
    button: {
      // ButtonPrimary handles its own colors, but we can override border-radius if needed
      borderRadius: 12,
    },
  });
};

export default styleSheet;
