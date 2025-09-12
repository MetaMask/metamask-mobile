import { StyleSheet } from 'react-native';

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
      fontWeight: '600',
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
