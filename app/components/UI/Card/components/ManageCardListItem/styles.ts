import { StyleSheet } from 'react-native';
import { Colors } from 'app/util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      padding: 16,
    },
    action: {
      paddingLeft: 16,
    },
  });

export default createStyles;
