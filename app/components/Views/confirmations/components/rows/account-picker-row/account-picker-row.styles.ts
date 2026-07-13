import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';

const stylesheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    rowContainer: {
      paddingVertical: 12,
      paddingHorizontal: 8,
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
    modalRoot: {
      flex: 1,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text.default,
      padding: 0,
    },
    list: {
      flex: 1,
    },
    accountItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    accountItemSelected: {
      backgroundColor: theme.colors.background.pressed,
    },
    accountItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flexShrink: 1,
    },
  });
};

export default stylesheet;
