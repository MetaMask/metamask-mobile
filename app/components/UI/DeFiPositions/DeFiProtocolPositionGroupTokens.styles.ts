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
    assetInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 20,
      marginRight: 8,
      gap: 8,
      minWidth: 0,
    },
    assetSymbolText: {
      flexShrink: 1,
    },
    balance: {
      alignItems: 'flex-end',
    },
  });

export default styleSheet;
