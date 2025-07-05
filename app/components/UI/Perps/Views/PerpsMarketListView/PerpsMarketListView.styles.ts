import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    headerSpacer: {
      width: 24,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      padding: 4,
    },
    listContainer: {
      flex: 1,
    },
    listHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 12,
      marginBottom: 8,
    },
    listHeaderLeft: {
      flex: 1,
    },
    listHeaderRight: {
      flex: 1,
      alignItems: 'flex-end',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    errorText: {
      textAlign: 'center',
      marginBottom: 16,
    },
    flashListContent: {
      paddingBottom: 16,
    },
    skeletonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      minHeight: 88,
    },
    skeletonLeftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    skeletonAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 16,
    },
    skeletonTokenInfo: {
      flex: 1,
    },
    skeletonTokenHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    skeletonTokenSymbol: {
      width: 60,
      height: 16,
      borderRadius: 4,
      marginRight: 8,
    },
    skeletonLeverage: {
      width: 30,
      height: 14,
      borderRadius: 4,
    },
    skeletonVolume: {
      width: 80,
      height: 12,
      borderRadius: 4,
    },
    skeletonRightSection: {
      alignItems: 'flex-end',
      flex: 1,
    },
    skeletonPrice: {
      width: 90,
      height: 16,
      borderRadius: 4,
      marginBottom: 6,
    },
    skeletonChange: {
      width: 70,
      height: 14,
      borderRadius: 4,
    },
    animatedListContainer: {
      flex: 1,
      paddingHorizontal: 16,
    },
  });
};

export default styleSheet;
