import { StyleSheet } from 'react-native';

const CUSTOM_NETWORK_PADDING_LEFT = 16;

const stylesheet = () =>
  StyleSheet.create({
    bodyContainer: {
      flex: 1,
    },
    scrollContentContainer: {
      // Buffer for the sheet/modal, so the network items are not cut off at the bottom
      paddingBottom: 100,
    },
    // custom network
    customNetworkContainer: {
      paddingLeft: CUSTOM_NETWORK_PADDING_LEFT,
    },
  });

export default stylesheet;
