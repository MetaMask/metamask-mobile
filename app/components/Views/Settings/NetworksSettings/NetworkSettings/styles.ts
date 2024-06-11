import { StyleSheet } from 'react-native';
import { isNetworkUiRedesignEnabled } from '../../../../../util/networks';

const createStyles = () =>
  StyleSheet.create({
    popularNetwork: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginVertical: 12,
    },
    popularNetworkImage: {
      width: 20,
      height: 20,
      marginRight: isNetworkUiRedesignEnabled ? 20 : 10,
      borderRadius: 10,
    },
    popularWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    icon: {
      marginRight: 16,
      marginTop: 4,
    },
  });

export default createStyles;
