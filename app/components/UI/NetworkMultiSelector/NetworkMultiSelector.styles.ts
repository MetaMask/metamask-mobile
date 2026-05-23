import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';
import { getElevatedSurfaceColor } from '../../../util/theme/themeUtils';

const stylesheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    bodyContainer: {
      flex: 1,
      backgroundColor: getElevatedSurfaceColor(theme),
    },
    // custom network
    customNetworkContainer: {
      paddingHorizontal: 16,
    },
    // select all popular networks cell
    selectAllPopularNetworksCell: {
      alignItems: 'center',
      backgroundColor: getElevatedSurfaceColor(theme),
    },
  });
};

export default stylesheet;
