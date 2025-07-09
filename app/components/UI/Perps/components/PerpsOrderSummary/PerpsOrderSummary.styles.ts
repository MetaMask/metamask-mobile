import { StyleSheet } from 'react-native';
import type { Colors } from '../../../../../util/theme/models';

export const createStyles = (_colors: Colors) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 24,
      paddingVertical: 16,
      marginTop: 32,
    },
  });
