import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const NETWORK_LIST_FLEX = 1;

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  const textDefault = colors.text.default;

  return StyleSheet.create({
    // bottom sheet
    networkAvatar: {
      marginHorizontal: 12,
    },
    networkName: {
      flex: NETWORK_LIST_FLEX,
      fontSize: 16,
      color: textDefault,
    },
    networkList: {
      flex: NETWORK_LIST_FLEX,
    },
    centeredNetworkCell: {
      alignItems: 'center',
    },
  });
};

export default createStyles;
