import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    skeletonButton: {
      width: '100%',
      height: 48,
      borderRadius: 10,
      flex: 1,
    },
  });

export default styleSheet;
