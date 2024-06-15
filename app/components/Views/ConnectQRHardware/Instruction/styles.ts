import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../styles/common';
import { Theme } from '../../../../util/theme/models';

// eslint-disable-next-line import/prefer-default-export
export const createStyles = (theme: Theme) =>
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
      color: theme.colors.text.alternative,
    },
    textContainer: {
      width: '100%',
      marginTop: 20,
    },
    text: {
      fontSize: 14,
      marginBottom: 24,
      ...fontStyles.normal,
      color: theme.colors.text.alternative,
    },
    link: {
      color: theme.colors.primary.default,
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
      color: theme.brandColors.white000,
      ...fontStyles.normal,
    },
    image: {
      width: 240,
      height: 96,
      marginTop: 20,
      marginBottom: 20,
    },
    keystone: {
      color: theme.colors.text.default,
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
