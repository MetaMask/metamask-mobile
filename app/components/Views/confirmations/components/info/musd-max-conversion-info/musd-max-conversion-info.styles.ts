import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    detailsSection: {
      backgroundColor: colors.background.default,
      borderRadius: 12,
      paddingVertical: 8,
    },
    assetHeader: {
      paddingHorizontal: 16,
    },
    buttonContainer: {
      paddingTop: 32,
      paddingHorizontal: 16,
    },
  });
};

export default styleSheet;
