import { StyleSheet } from 'react-native';

/**
 *
 * @returns StyleSheet object.
 */
const styleSheet = () =>
  StyleSheet.create({
    underlyingBalancesWrapper: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    assetSymbolText: {
      marginLeft: 20,
    },
    balance: {
      flex: 1,
      alignItems: 'flex-end',
    },
  });

export default styleSheet;
