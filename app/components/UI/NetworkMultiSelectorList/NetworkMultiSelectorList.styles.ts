import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const NETWORK_AVATAR_MARGIN_HORIZONTAL = 10;
const NETWORK_LIST_MARGIN_HORIZONTAL = 6;
const NETWORK_LIST_FLEX = 1;
const NETWORK_NAME_FONT_SIZE = 16;

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  const textDefault = colors.text.default;

  return StyleSheet.create({
    // bottom sheet
    networkAvatar: {
      marginHorizontal: NETWORK_AVATAR_MARGIN_HORIZONTAL,
    },
    networkName: {
      flex: NETWORK_LIST_FLEX,
      fontSize: NETWORK_NAME_FONT_SIZE,
      color: textDefault,
    },
    networkList: {
      marginHorizontal: NETWORK_LIST_MARGIN_HORIZONTAL,
      flex: NETWORK_LIST_FLEX,
    },
    centeredNetworkCell: {
      alignItems: 'center',
    },
  });
};

export default createStyles;
