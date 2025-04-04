import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    stakingEarningsHistoryListContainer: {
      flex: 1,
      paddingTop: 24,
      paddingBottom: 35,
    },
    lineItemContainer: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 8,
    },
    rightLineItemContainer: {
      flex: 1,
      width: '50%',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    rightLineItemBox: {
      flex: 1,
    },
    leftLineItemBox: {
      width: '50%',
      justifyContent: 'center',
      alignItems: 'flex-start',
      flex: 1,
      paddingTop: 10,
      paddingBottom: 10,
    },
    lineItemGroupHeaderContainer: {
      paddingTop: 10,
      paddingBottom: 10,
    },
  });

export default styleSheet;
