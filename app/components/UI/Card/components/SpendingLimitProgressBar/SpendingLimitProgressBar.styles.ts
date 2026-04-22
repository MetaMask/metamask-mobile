import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      gap: 8,
      width: '100%',
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border.muted,
      width: '100%',
      marginTop: 8,
    },
    textContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    skeletonRounded: {
      borderRadius: 12,
    },
  });

export default createStyles;
