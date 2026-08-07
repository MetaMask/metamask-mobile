import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const stylesheet = (params: {
  theme: Theme;
  vars: { isPureBlack: boolean };
}) => {
  const {
    theme,
    vars: { isPureBlack },
  } = params;
  const { colors } = theme;
  return StyleSheet.create({
    bodyContainer: {
      flex: 1,
      backgroundColor: isPureBlack
        ? colors.background.section
        : colors.background.default,
    },
    // custom network
    customNetworkContainer: {
      paddingHorizontal: 16,
    },
    // select all popular networks cell
    selectAllPopularNetworksCell: {
      alignItems: 'center',
    },
  });
};

export default stylesheet;
