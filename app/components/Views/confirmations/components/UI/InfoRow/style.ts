import { StyleSheet } from 'react-native';

import { Colors } from '../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../styles/common';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      paddingBottom: 8,
      paddingHorizontal: 8,
    },
    label: {
      color: colors.text.default,
      ...fontStyles.bold,
      fontSize: 14,
      fontWeight: '500',
      marginTop: 8,
    },
    value: {
      color: colors.text.default,
      ...fontStyles.normal,
      fontSize: 14,
      marginTop: 8,
    }
  });

export default createStyles;
