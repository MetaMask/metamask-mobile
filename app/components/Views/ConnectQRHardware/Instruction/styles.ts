import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../styles/common';
import { Theme } from '../../../../util/theme/models';
import { EdgeInsets } from 'react-native-safe-area-context';

export const createStyles = (theme: Theme, insets: EdgeInsets) =>
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
      marginBottom: insets.bottom + 20,
    },
    button: {
      padding: 5,
      paddingHorizontal: '30%',
    },
    buttonText: {
      color: theme.brandColors.white,
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
