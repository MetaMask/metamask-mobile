import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginHorizontal: 16,
      marginTop: 16,
      backgroundColor: theme.colors.warning.muted,
      flexDirection: 'row',
      borderRadius: 16,
    },
    contentContainer: {
      flex: 1,
      marginLeft: 16,
    },
    textsContainer: {
      flex: 1,
      gap: 4,
    },
    buttonsContainer: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 16,
    },
    isHidden: {
      display: 'none',
    },
  });

export default createStyles;
