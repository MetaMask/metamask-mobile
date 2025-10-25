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
<<<<<<< HEAD
=======
      gap: 16,
>>>>>>> 8ae259608f (feat: card delegation)
      marginLeft: 16,
    },
    textsContainer: {
      flex: 1,
      gap: 4,
    },
    buttonsContainer: {
      flexDirection: 'row',
      gap: 8,
<<<<<<< HEAD
      marginTop: 16,
    },
    isHidden: {
      display: 'none',
=======
>>>>>>> 8ae259608f (feat: card delegation)
    },
  });

export default createStyles;
