import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

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
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background.alternative,
    },
  });
};

export default createStyles;
