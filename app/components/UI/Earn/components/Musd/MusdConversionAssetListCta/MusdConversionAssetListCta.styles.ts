import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      height: 64, // Match AssetElement height
      alignItems: 'center',
    },
    assetInfo: {
      flexDirection: 'row',
      gap: 20,
    },
    button: {
      alignSelf: 'center',
      height: 32,
    },
  });

export default styleSheet;
