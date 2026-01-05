import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    backButton: {
      position: 'absolute',
      top: 60,
      right: 0,
      zIndex: 10,
    },
  });

export default styleSheet;
