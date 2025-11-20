import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      padding: 8,
      gap: 16,
      width: '100%',
    },
    positionContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingBottom: 16,
      gap: 16,
      width: '100%',
    },
    positionContent: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
      minHeight: 44, // Match image height
    },
    positionDetails: {
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      flex: 1,
    },
    pnlContainer: {
      position: 'absolute',
      top: 0,
      right: 0,
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
    },
    titleText: {
      marginRight: 80, // Reserve space for PnL text
    },
    subtitleText: {
      flex: 1,
      marginRight: 80, // Reserve space for PnL text
    },
    positionImage: {
      width: 40,
      height: 40,
      borderRadius: 100,
      alignSelf: 'center',
    },
    positionPnl: {
      flexDirection: 'column',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      width: '100%',
      flex: 1,
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
    positionActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
  });

export default styleSheet;
