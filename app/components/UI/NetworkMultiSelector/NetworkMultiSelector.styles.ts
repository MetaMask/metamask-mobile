import { StyleSheet } from 'react-native';

const BODY_CONTAINER_PADDING_BOTTOM = 4;
const CUSTOM_NETWORK_PADDING_HORIZONTAL = 16;

const stylesheet = () =>
  StyleSheet.create({
    bodyContainer: {
      paddingBottom: BODY_CONTAINER_PADDING_BOTTOM,
      flex: 1,
    },
    // custom network
    customNetworkContainer: {
      paddingHorizontal: CUSTOM_NETWORK_PADDING_HORIZONTAL,
    },
  });

export default stylesheet;
