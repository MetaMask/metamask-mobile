import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    card: {
      paddingVertical: 12,
      marginVertical: 2,
    },
    cardContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    assetIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    cardInfo: {
      flex: 1,
    },
    cardRight: {
      alignItems: 'flex-end',
    },
  });

export default styleSheet;
