import { StyleSheet } from 'react-native';
import { Colors } from '../../../util/theme/models';

const styleSheet = (params: { theme: { colors: Colors } }) => {
  const { colors } = params.theme;
  return {
    view: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.background.default,
    },
  };
};

export default styleSheet;
