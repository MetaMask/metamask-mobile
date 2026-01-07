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
      paddingVertical: 8,
      gap: 16,
      width: '100%',
    },
    positionDetails: {
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      flex: 1,
    },
    positionImageContainer: {
      paddingTop: 4,
    },
    positionImage: {
      width: 40,
      height: 40,
      borderRadius: 100,
      alignSelf: 'flex-start',
    },
    positionPnl: {
      flexDirection: 'column',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
    },
    skeletonSpacing: {
      marginBottom: 4,
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
