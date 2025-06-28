import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const stylesheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    // select all
    selectAllText: {
      marginLeft: 0,
      marginVertical: 12,
      color: colors.primary.default,
      paddingHorizontal: 16,
    },
    bodyContainer: {
      paddingBottom: 4,
      flex: 1,
    },
    // custom network
    customNetworkContainer: {
      paddingHorizontal: 16,
    },
  });
};

export default stylesheet;
