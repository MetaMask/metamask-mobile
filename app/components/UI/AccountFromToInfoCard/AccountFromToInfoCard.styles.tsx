import { StyleSheet } from 'react-native';

import { Colors } from '../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      marginHorizontal: 16,
    },
    text: {
      lineHeight: 20,
      color: colors.text.default,
    },
  });

export default createStyles;
