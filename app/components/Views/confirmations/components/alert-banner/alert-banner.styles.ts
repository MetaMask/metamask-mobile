import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme; vars: { inline?: boolean } }) =>
  StyleSheet.create({
    wrapper: {
      marginHorizontal: params.vars.inline ? 0 : 16,
      marginBottom: !params.vars.inline ? 24 : 8,
    },
    details: { marginLeft: 10, marginBottom: 10 },
    detailsItem: {
      marginBottom: 5,
    },
  });

export default styleSheet;
