import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';
import { EdgeInsets } from 'react-native-safe-area-context';

const stylesheet = (params: { theme: Theme; vars: { insets: EdgeInsets } }) =>
  StyleSheet.create({
    bodyContainer: {
      flex: 1,
    },
    scrollContentContainer: {
      paddingBottom: params.vars.insets.bottom + 16,
    },
    // custom network
    customNetworkContainer: {
      paddingLeft: 24,
      paddingRight: 16,
    },
    // select all popular networks cell
    selectAllPopularNetworksCell: {
      alignItems: 'center',
    },
  });

export default stylesheet;
