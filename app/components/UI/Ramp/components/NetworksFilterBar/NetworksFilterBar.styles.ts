import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    networksContainer: {
      paddingHorizontal: 16,
      flexDirection: 'row',
      gap: 8,
    },
    selectedNetworkIcon: {
      marginRight: 8,
    },
    overlappedNetworkIcon: {
      marginLeft: -6,
    },
  });

export default styleSheet;
