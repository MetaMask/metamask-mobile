import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    button: {
      borderRadius: 12,
      height: 48,
      flexGrow: 1,
      marginBottom: 12,
    },

    disabledButton: {
      opacity: 0.5,
    },

    skeletonButton: {
      width: '100%',
      height: 48,
      borderRadius: 10,
      flex: 1,
    },
  });

export default styleSheet;
