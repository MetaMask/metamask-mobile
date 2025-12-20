import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      paddingVertical: 32,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    errorContainer: {
      paddingVertical: 16,
      alignItems: 'center',
    },
    assetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      gap: 12,
    },
    assetInfo: {
      flex: 1,
    },
    detailsSection: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginBottom: 16,
    },
    contentContainer: {
      paddingBottom: 16,
      gap: 12,
    },
    buttonContainer: {
      paddingTop: 16,
    },
  });
};

export default styleSheet;
