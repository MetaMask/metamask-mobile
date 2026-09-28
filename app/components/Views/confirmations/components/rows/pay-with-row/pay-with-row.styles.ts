import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      // Reserve the 24px text line plus bottom padding for skeleton and live rows.
      minHeight: 34,
      paddingHorizontal: 8,
      paddingBottom: 10,
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

    skeletonCircle: {
      borderRadius: 99,
    },

    moneyIcon: {
      width: 20,
      height: 20,
      borderRadius: 4,
      backgroundColor: params.theme.colors.accent04.light,
    },

    disabled: {
      opacity: 0.5,
    },
  });

export default styleSheet;
