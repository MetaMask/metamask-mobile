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
      paddingVertical: 8,
      marginBottom: 16,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'left',
    },
    searchButton: {
      padding: 4,
    },
    tabContainer: {
      flexDirection: 'row',
      borderWidth: 1,
      marginHorizontal: 16,
      borderRadius: 12,
      borderColor: colors.border.muted,
      padding: 2,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 17,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabButtonActive: {
      backgroundColor: colors.background.defaultPressed,
    },
    tabButtonInactive: {
      backgroundColor: colors.background.default,
    },
    headerSpacer: {
      width: 24,
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
      marginBottom: 8,
      marginTop: 30,
    },
    listHeaderLeft: {
      flex: 1,
    },
    listHeaderRight: {
      flex: 1,
      alignItems: 'flex-end',
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
      paddingTop: 16,
    },
    searchContainer: {
      marginHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border.muted,
      borderRadius: 12,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.muted,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    searchIcon: {
      marginRight: 10,
      color: colors.icon.muted,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text.default,
    },
    clearButton: {
      padding: 4,
      marginLeft: 8,
    },
  });
};

export default styleSheet;
