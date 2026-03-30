import { StyleSheet } from 'react-native';
import { Theme } from '@metamask/design-tokens';

const stylesheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      alignSelf: 'stretch',
      marginTop: 8,
      paddingHorizontal: 16,
    },
    label: {
      marginBottom: 6,
      color: theme.colors.text.alternative,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.colors.text.default,
      backgroundColor: theme.colors.background.default,
      fontSize: 14,
    },
  });
};

export default stylesheet;
