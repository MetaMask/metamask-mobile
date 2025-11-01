import { StyleSheet } from 'react-native';
import { Colors } from 'app/util/theme/models';

const createStyles = (
  colors: Colors,
  descriptionOrientation: 'row' | 'column',
) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
    },
    action: {
      paddingLeft: 16,
    },
    description: {
      justifyContent: 'space-between',
      flexDirection: descriptionOrientation,
      alignItems: descriptionOrientation === 'row' ? 'center' : 'flex-start',
    },
  });

export default createStyles;
