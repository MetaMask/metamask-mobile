import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      paddingInline: 8,
      paddingVertical: 4,
    },

    spinner: {
      paddingInline: 8,
      paddingVertical: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },

    skeleton: {
      marginBottom: 7,
      marginLeft: -2,
    },

    skeletonTop: {
      marginTop: 6,
      marginBottom: 7,
      marginLeft: -2,
    },

    skeletonCircle: {
      marginLeft: -1,
      marginTop: 6,
      borderRadius: 99,
    },
  });

export default styleSheet;
