import { Theme } from '../../../../../util/theme/models';
import { StyleSheet } from 'react-native';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginHorizontal: 16,
    },
    banner: {
      backgroundColor: theme.colors.warning.muted,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 16,
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      width: '100%',
    },
  });

export default createStyles;
