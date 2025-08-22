import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const SELECT_ALL_MARGIN_LEFT = 0;
const SELECT_ALL_MARGIN_VERTICAL = 12;
const SELECT_ALL_PADDING_HORIZONTAL = 16;
const CUSTOM_NETWORK_PADDING_HORIZONTAL = 16;

const stylesheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  const primaryDefault = colors.primary.default;

  return StyleSheet.create({
    // select all
    selectAllText: {
      marginLeft: SELECT_ALL_MARGIN_LEFT,
      marginVertical: SELECT_ALL_MARGIN_VERTICAL,
      color: primaryDefault,
      paddingHorizontal: SELECT_ALL_PADDING_HORIZONTAL,
    },
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
};

export default stylesheet;
