import { StyleSheet } from 'react-native';
import { Theme } from '@metamask/design-tokens';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeAreaView: {
      flex: 1,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
      paddingHorizontal: 16,
      justifyContent: 'space-between',
    },
    wrapper: {
      alignItems: 'center',
    },
    imageWrapper: {
      alignItems: 'center',
    },
    image: {
      transform: [{ rotate: '1.9deg' }],
    },
    button: {
      marginTop: 48,
      marginBottom: 32,
    },
  });

export default createStyles;
