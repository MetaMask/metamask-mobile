import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const stylesheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    bodyContainer: {
      flex: 1,
      backgroundColor: colors.background.section,
    },
    // custom network
    customNetworkContainer: {
      paddingHorizontal: 16,
    },
    // select all popular networks cell
    selectAllPopularNetworksCell: {
      alignItems: 'center',
      backgroundColor: colors.background.section,
    },
  });
};

export default stylesheet;
