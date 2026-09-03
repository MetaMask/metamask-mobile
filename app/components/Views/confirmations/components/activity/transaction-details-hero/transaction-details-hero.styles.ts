import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      marginVertical: 12,
    },
    youReceivedLabel: {
      marginTop: 8,
    },
  });

export default styleSheet;
