import { StyleSheet } from 'react-native';

const createStyles = (bottom: number) =>
  StyleSheet.create({
    container: {
      paddingBottom: Math.max(bottom, 16),
    },
  });

export default createStyles;
