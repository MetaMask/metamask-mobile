import { StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme; vars: { style?: ViewStyle } }) =>
  StyleSheet.create({
    banner: {
      marginVertical: 16,
      ...params.vars.style,
    },
    textContainer: {
      flexWrap: 'wrap',
    },
    link: {
      color: params.theme.colors.primary.default,
    },
    description: {
      color: params.theme.colors.text.default,
    },
  });

export default styleSheet;
