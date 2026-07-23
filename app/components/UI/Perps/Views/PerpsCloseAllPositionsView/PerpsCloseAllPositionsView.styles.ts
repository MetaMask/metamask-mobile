import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

export const createStyles = (_theme: Theme) =>
  StyleSheet.create({
    description: {
      marginBottom: 16,
    },
    loadingContainer: {
      paddingVertical: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginTop: 12,
    },
    emptyContainer: {
      paddingVertical: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
