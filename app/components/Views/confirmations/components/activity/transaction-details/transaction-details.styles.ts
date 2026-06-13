import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: params.theme.colors.background.default,
    },
    container: {
      paddingInline: 16,
    },
  });

export default styleSheet;
