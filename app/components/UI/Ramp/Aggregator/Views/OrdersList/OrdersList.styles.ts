import { StyleSheet } from 'react-native';
import { Colors } from '../../../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
<<<<<<< HEAD
    emptyContainer: {
      width: '100%',
      alignItems: 'center',
      paddingVertical: 40,
    },
=======
>>>>>>> 80d03cf3047b54b35b37f030b3a1fa5d5590a316
    row: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.muted,
    },
  });

export default createStyles;
