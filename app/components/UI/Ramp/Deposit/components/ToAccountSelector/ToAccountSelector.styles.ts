import { StyleSheet } from 'react-native';
import { Theme } from '@metamask/design-tokens';

const stylesheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      alignItems: 'center',
      marginTop: 8,
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
    selector: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
      alignItems: 'center',
      backgroundColor: theme.colors.background.muted,
      borderRadius: 12,
      padding: 8,
      alignSelf: 'center',
      flexShrink: 1,
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
