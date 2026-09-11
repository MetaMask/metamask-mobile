import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { isSelected: boolean };
}) => {
  const { theme, vars } = params;
  const { isSelected } = vars;

  return StyleSheet.create({
    card: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'flex-start',
      gap: 12,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isSelected
        ? theme.colors.border.default
        : theme.colors.border.muted,
      backgroundColor: theme.colors.background.section,
    },
    topRow: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    logoContainer: {
      flexShrink: 0,
    },
    checkboxContainer: {
      flexShrink: 0,
    },
  });
};

export default styleSheet;
