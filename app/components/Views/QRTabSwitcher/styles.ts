import { Dimensions, StyleSheet, TextStyle } from 'react-native';
import { Theme } from '../../../util/theme/models';

const createStyles = (theme: Theme) => {
  const { height } = Dimensions.get('window');

  const navbarTop = height * 0.05 + 20;

  return StyleSheet.create({
    container: {
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    overlay: {
      position: 'absolute',
      width: '100%',
      top: navbarTop,
      paddingHorizontal: 16,
    },
    text: {
      ...(theme.typography.sBodyMD as TextStyle),
      color: theme.colors.text.default,
    },
    header: {
      backgroundColor: undefined,
      zIndex: 2,
    },
  });
};
export default createStyles;
