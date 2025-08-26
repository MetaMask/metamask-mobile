import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    positionContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 8,
      gap: 16,
      width: '100%',
    },
    positionDetails: {
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      width: '100%',
      flex: 5,
      gap: 4,
    },
    positionImage: {
      width: 44,
      height: 44,
      borderRadius: 100,
      alignSelf: 'center',
    },
    positionPnl: {
      flexDirection: 'column',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      gap: 4,
      width: '100%',
      flex: 2,
    },
    marketEntry: {
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      width: '100%',
    },
    viewAllMarkets: {
      marginTop: 16,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
  });

export default styleSheet;
