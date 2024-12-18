import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    changesCard: {
      borderWidth: 0,
      borderRadius: 8,
      gap: 16,
    },
    estimatedChangesWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    youReceiveWrapper: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    youReceiveRightSide: {
      alignItems: 'flex-end',
      gap: 2,
    },
    flexRow: {
      flexDirection: 'row',
      gap: 4,
    },
    youReceiveFiat: {
      paddingRight: 8,
    },
    ethLogo: {
      width: 32,
      height: 32,
      borderRadius: 16,
      overflow: 'hidden',
    },
  });

export default styleSheet;
