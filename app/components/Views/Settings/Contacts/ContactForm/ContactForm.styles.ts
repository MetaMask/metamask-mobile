import { StyleSheet } from 'react-native';
import type { Colors } from '../../../../../util/theme/models';

export const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      flexDirection: 'column',
    },
    informationWrapper: {
      flex: 1,
      paddingHorizontal: 24,
    },
  });
