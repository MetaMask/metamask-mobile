import { StyleSheet } from 'react-native';

const CUSTOM_NETWORK_PADDING_HORIZONTAL = 16;

const stylesheet = () =>
  StyleSheet.create({
    bodyContainer: {
      flex: 1,
    },
    scrollContentContainer: {
      paddingBottom: 100,
    },
    // custom network
    customNetworkContainer: {
      paddingHorizontal: CUSTOM_NETWORK_PADDING_HORIZONTAL,
    },
  });

export default stylesheet;
