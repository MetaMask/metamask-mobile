import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      marginHorizontal: 16,
      marginTop: 16,
      borderWidth: 1,
      borderColor: colors.border.muted,
      borderRadius: 12,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.muted,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 8,
      minHeight: 50,
    },
    searchIcon: {
      marginRight: 10,
      color: colors.icon.muted,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: colors.text.default,
      includeFontPadding: false, // Android-specific: removes extra font padding
    },
    clearButton: {
      padding: 4,
      marginLeft: 8,
    },
  });
};

export default styleSheet;
