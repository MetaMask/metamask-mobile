import { StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme; vars: { style?: ViewStyle } }) =>
  StyleSheet.create({
    banner: {
      marginBottom: 16,
      ...params.vars.style,
    },
  });

export default styleSheet;
