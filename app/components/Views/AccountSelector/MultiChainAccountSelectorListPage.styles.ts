import { StyleSheet } from 'react-native';
import { Theme } from '@metamask/design-tokens';

const styleSheet = (params: { theme: Theme }) => {
  const {
    theme: { colors },
  } = params;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    header: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      margin: 16,
    },
    footer: {
      backgroundColor: colors.background.default,
      flexDirection: 'row',
      paddingVertical: 4,
      paddingHorizontal: 8,
      marginVertical: 16,
      marginHorizontal: 16,
    },
    button: { flex: 1 },
  });
};

export default styleSheet;
