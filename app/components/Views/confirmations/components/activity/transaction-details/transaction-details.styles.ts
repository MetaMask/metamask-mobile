import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
    },
    container: {
      paddingInline: 16,
    },
  });

export default styleSheet;
