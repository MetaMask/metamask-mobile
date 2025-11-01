import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    percentageButton: {
      borderRadius: 12,
      height: 48,
      flexGrow: 1,
      fontSize: 20,
      marginBottom: 12,
    },

    alertContainer: {
      borderRadius: 12,
      height: 48,
      flexGrow: 1,
      fontSize: 20,
      marginBottom: 12,
      backgroundColor: params.theme.colors.error.muted,
    },

    alertText: {
      color: params.theme.colors.error.default,
      textAlign: 'center',
      lineHeight: 48,
      fontSize: 20,
      fontFamily: 'Geist Bold',
    },

    skeletonButton: {
      width: '100%',
      height: 40,
      borderRadius: 10,
      flex: 1,
    },
  });

export default styleSheet;
