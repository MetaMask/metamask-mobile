import { StyleSheet } from 'react-native';

import { Colors } from '../../../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../../../styles/common';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
    },
    value: {
      color: colors.text.default,
      ...fontStyles.normal,
      marginTop: 8,
    },
    warningContainer: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 8,
      marginTop: 8,
      paddingVertical: 2,
      paddingHorizontal: 4,
      backgroundColor: colors.error.muted,
      borderRadius: 4,
    },
    warningText: {
      color: colors.error.default,
      marginLeft: 4,
    },
  });

export default createStyles;
