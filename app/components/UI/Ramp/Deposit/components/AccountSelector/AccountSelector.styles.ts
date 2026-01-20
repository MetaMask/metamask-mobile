import { StyleSheet } from 'react-native';
import { Theme } from '@metamask/design-tokens';

const stylesheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    selector: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
      alignItems: 'center',
      backgroundColor: theme.colors.background.muted,
      borderRadius: 12,
      padding: 8,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      alignSelf: 'flex-start',
    },
  });
};

export default stylesheet;
