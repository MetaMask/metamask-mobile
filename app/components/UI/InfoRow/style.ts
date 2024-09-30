import { StyleSheet } from 'react-native';

import { Colors } from '../../../util/theme/models';
import { fontStyles } from '../../../styles/common';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      padding: 8,
    },
    label: {
      color: colors.text.default,
      ...fontStyles.bold,
      fontSize: 14,
      fontWeight: '500',
    },
    value: {
      color: colors.text.default,
      ...fontStyles.normal,
      fontSize: 14,
    }
  });

export default createStyles;
