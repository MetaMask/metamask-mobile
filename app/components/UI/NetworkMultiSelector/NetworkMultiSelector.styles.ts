import { StyleSheet } from 'react-native';

const CUSTOM_NETWORK_PADDING_LEFT = 16;

const stylesheet = () =>
  StyleSheet.create({
    bodyContainer: {
      flex: 1,
    },
    scrollContentContainer: {
      paddingBottom: 16,
    },
    // custom network
    customNetworkContainer: {
      paddingLeft: CUSTOM_NETWORK_PADDING_LEFT,
    },
  });

export default stylesheet;
