import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';

const createStyles = (colors: {
  background: { default: string };
  text: { default: string };
  primary: { default: string };
}) =>
  StyleSheet.create({
    modal: {
      margin: 0,
      justifyContent: 'flex-end',
    },
    wrapper: {
      backgroundColor: colors.background.default,
      borderRadius: 12,
      padding: 24,
      alignItems: 'center',
    },
    title: {
      ...fontStyles.bold,
      fontSize: 18,
      color: colors.text.default,
      marginTop: 20,
      marginBottom: 20,
      textAlign: 'center',
    },
    featureList: {
      width: '100%',
      marginBottom: 24,
    },
    cancelButton: {
      marginTop: 12,
    },
  });

export default createStyles;