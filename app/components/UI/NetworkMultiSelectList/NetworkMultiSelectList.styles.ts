import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    // bottom sheet
    networkAvatar: {
      marginHorizontal: 10,
    },
    networkName: {
      flex: 1,
      fontSize: 16,
    },
    networkList: {
      marginHorizontal: 6,
      flex: 1,
    },
  });
};

export default createStyles;
