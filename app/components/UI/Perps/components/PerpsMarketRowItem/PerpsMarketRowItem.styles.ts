import { StyleSheet } from 'react-native';

const styleSheet = (params: { vars: { compact: boolean } }) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: params.vars.compact ? 8 : 16,
    },
    perpIcon: {
      marginRight: 16,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    tokenInfo: {
      flex: 1,
    },
    tokenHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    secondRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 2,
    },
    rightSection: {
      alignItems: 'flex-end',
      flex: 1,
    },
    priceInfo: {
      alignItems: 'flex-end',
    },
    price: {
      marginBottom: 2,
    },
    priceChange: {
      marginTop: 2,
    },
  });

export default styleSheet;
