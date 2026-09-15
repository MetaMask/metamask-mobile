import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const stylesheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    bodyContainer: {
      flex: 1,
      backgroundColor: theme.colors.background.elevated1,
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
