import { StyleSheet } from 'react-native';
import { Colors } from '../../../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.primary.default,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 99,
      overflow: 'hidden',
    },
    progressContainer: {
      ...StyleSheet.absoluteFillObject,
      width: 0,
      backgroundColor: colors.primary.alternative,
    },
    label: {
      position: 'absolute',
    },
    disabled: {
      opacity: 0.5,
    },
  });

export default createStyles;
