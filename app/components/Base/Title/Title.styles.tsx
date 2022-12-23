import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { Colors } from '../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    text: {
      fontSize: 18,
      marginVertical: 3,
      color: colors.text.default,
      ...fontStyles.bold,
    },
    hero: {
      fontSize: 22,
    },
    centered: {
      textAlign: 'center',
    },
  });

export default createStyles;
