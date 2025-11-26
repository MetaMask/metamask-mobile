import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../../styles/common';

const createStyles = () =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 32,
    },
    header: {
      width: '100%',
      alignItems: 'flex-start',
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      ...fontStyles.medium,
      textAlign: 'left',
      width: '100%',
    },
    description: {
      textAlign: 'left',
      lineHeight: 24,
      marginBottom: 48,
      fontSize: 16,
    },
    turnOnButton: {
      borderRadius: 12,
    },
  });

export default createStyles;
