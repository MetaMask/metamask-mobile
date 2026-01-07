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
  });

export default styleSheet;
