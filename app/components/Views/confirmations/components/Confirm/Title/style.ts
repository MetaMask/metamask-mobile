import { StyleSheet } from 'react-native';

import { Colors } from '../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../styles/common';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    titleContainer: {
      marginBottom: 10,
    },
    title: {
      color: colors.text.default,
      ...fontStyles.bold,
      fontSize: 18,
      fontWeight: '700'
    }
  });

export default createStyles;
