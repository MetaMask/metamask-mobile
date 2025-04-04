import { StyleSheet } from 'react-native';

import { Colors } from '../../../../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background.default,
      borderColor: colors.border.muted,
      borderRadius: 8,
      borderWidth: 1,
      padding: 8,
      minWidth: '100%',
      marginVertical: 4,
    },
  });

export default createStyles;
