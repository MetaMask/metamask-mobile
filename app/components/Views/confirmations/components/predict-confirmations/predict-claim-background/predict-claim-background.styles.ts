import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: {
    screenWidth: number;
    screenHeight: number;
  };
}) =>
  StyleSheet.create({
    image: {
      width: params.vars.screenWidth,
      height: params.vars.screenHeight * 0.5,
      marginLeft: -16,
    },
  });

export default styleSheet;
