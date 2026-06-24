import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

export const createStateSelectorStyles = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    label: {
      marginBottom: 6,
    },
    field: {
      flexDirection: 'column',
      marginBottom: 16,
    },
    error: {
      color: theme.colors.error.default,
      fontSize: 12,
      marginTop: 4,
    },
    selectorContainer: {
      position: 'relative',
    },
    selectorTouchable: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      borderRadius: 8,
      backgroundColor: theme.colors.background.default,
      minHeight: 48,
    },
    selectorText: {
      flex: 1,
      color: theme.colors.text.default,
      fontSize: 16,
    },
    placeholderText: {
      color: theme.colors.text.muted,
      fontSize: 16,
    },
    icon: {
      marginLeft: 8,
    },
  });
};
