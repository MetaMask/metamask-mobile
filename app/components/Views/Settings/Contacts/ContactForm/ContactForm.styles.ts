import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../../styles/common';
import type { Colors } from '../../../../../util/theme/models';

export const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      flexDirection: 'column',
    },
    scrollWrapper: {
      paddingVertical: 12,
      gap: 16,
    },
    informationWrapper: {
      flex: 1,
      paddingHorizontal: 24,
    },
    networkField: {
      gap: 8,
    },
    headerEndActionText: {
      color: colors.primary.default,
      fontSize: 14,
    },
    buttonsWrapper: {
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 16,
      gap: 8,
    },
  });

export type ContactFormStyles = ReturnType<typeof createStyles>;
