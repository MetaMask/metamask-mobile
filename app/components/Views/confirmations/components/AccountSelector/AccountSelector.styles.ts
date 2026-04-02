import { StyleSheet } from 'react-native';
import { Theme } from '@metamask/design-tokens';

const stylesheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    valueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 1,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
    },
    accountText: {
      flexShrink: 1,
    },
    placeholderText: {
      color: theme.colors.text.alternative,
    },
  });
};

export default stylesheet;
