import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background.default,
      overflow: 'hidden',
      paddingTop: 12,
      paddingBottom: 16,
      paddingHorizontal: 16,
      gap: 12,
    },
    slippageButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
  });

export default createStyles;
