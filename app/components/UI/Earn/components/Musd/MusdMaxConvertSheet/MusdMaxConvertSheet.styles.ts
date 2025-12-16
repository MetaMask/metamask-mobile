import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      paddingHorizontal: 16,
    },
    // Asset header section (icon + symbol + fiat amount)
    assetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      gap: 12,
    },
    assetInfo: {
      flex: 1,
    },
    // Details section with background
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
    loadingContainer: {
      paddingVertical: 32,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    rowContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    errorContainer: {
      paddingVertical: 16,
      alignItems: 'center',
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 16,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    button: {
      flex: 1,
    },
  });
};

export default styleSheet;
