import { StyleSheet } from 'react-native';

const stylesheet = () =>
  StyleSheet.create({
    bodyContainer: {
      flex: 1,
    },
    // custom network
    customNetworkContainer: {
      paddingLeft: 24,
      paddingRight: 16,
    },
    // select all popular networks cell
    selectAllPopularNetworksCell: {
      alignItems: 'center',
    },
  });

export default stylesheet;
