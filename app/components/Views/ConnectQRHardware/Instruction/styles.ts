import { StyleSheet } from 'react-native';
import {
  fontStyles,
  colors as importedColors,
} from '../../../../styles/common';

// eslint-disable-next-line import/prefer-default-export
export const createStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
    },
    container: {
      flexDirection: 'column',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    scrollWrapper: {
      width: '100%',
    },
    title: {
      width: '100%',
      marginTop: 40,
      fontSize: 24,
      marginBottom: 20,
      ...fontStyles.normal,
      color: colors.text.alternative,
    },
    textContainer: {
      width: '100%',
      marginTop: 20,
    },
    text: {
      fontSize: 14,
      marginBottom: 24,
      ...fontStyles.normal,
      color: colors.text.alternative,
    },
    link: {
      color: colors.primary.default,
      ...fontStyles.bold,
    },
    bottom: {
      alignItems: 'center',
      height: 80,
      justifyContent: 'space-between',
    },
    button: {
      padding: 5,
      paddingHorizontal: '30%',
    },
    buttonText: {
      color: importedColors.white,
      ...fontStyles.normal,
    },
    image: {
      width: 240,
      height: 96,
      marginTop: 20,
      marginBottom: 20,
    },
    keystone: {
      color: colors.text.default,
      height: 48,
      fontSize: 24,
    },
    buttonGroup: {
      display: 'flex',
      flexDirection: 'row',
    },
    linkMarginRight: {
      marginRight: 16,
    },
  });
