import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

export const stylesheet = (params: {
  theme: Theme;
  vars: { isExpanded: boolean };
}) =>
  StyleSheet.create({
    container: {
      paddingLeft: 16,
      paddingRight: 16,
      paddingBottom: params.vars.isExpanded ? 8 : 0,
      borderRadius: 8,
    },
    header: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: params.vars.isExpanded ? 0 : 8,
    },
  });
