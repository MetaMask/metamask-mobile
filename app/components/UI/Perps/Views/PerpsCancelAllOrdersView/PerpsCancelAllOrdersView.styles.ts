import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

export const createStyles = (_theme: Theme) =>
  StyleSheet.create({
    contentContainer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
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
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerContainer: {
      paddingHorizontal: 16,
    },
  });
