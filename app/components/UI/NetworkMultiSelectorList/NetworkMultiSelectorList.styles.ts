import { StyleSheet } from 'react-native';

const NETWORK_LIST_FLEX = 1;

const createStyles = () =>
  StyleSheet.create({
    // bottom sheet
    networkList: {
      flex: NETWORK_LIST_FLEX,
    },
    noNetworkFeeContainer: {
      alignSelf: 'center',
    },
    networkNameText: {
      flexGrow: 0,
      flexShrink: 1,
      minWidth: 0,
    },
  });

export default createStyles;
