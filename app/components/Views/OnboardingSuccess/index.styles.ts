import { StyleSheet } from 'react-native';
import { ThemeColors } from '@metamask/design-tokens';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    animationSection: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonSection: {
      paddingBottom: 4,
      alignItems: 'center',
      rowGap: 12,
    },
    textTitle: {
      marginTop: 25,
      marginBottom: 16,
      marginHorizontal: 16,
      textAlign: 'center',
      fontFamily: 'MMSans-Regular',
    },
    footerLink: {
      paddingVertical: 8,
      alignItems: 'center',
    },
  });

export default createStyles;
