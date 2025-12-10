import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    tooltipIcon: {
      width: 20,
      height: 20,
    },
  });

export default styleSheet;
