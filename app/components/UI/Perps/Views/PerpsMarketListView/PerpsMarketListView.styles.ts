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
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    headerTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    backButtonWrapper: {
      padding: 12, // Increases touch target to ~48x48
      marginLeft: -12, // Compensate for padding to maintain visual alignment
      marginRight: -12,
    },
    headerTitle: {
      textAlign: 'left',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    titleButtonsRightContainer: {
      flexDirection: 'row',
    },
    tutorialButton: {
      padding: 4,
    },
    searchButton: {
      padding: 4,
      marginRight: 4,
    },
    listContainer: {
      flex: 1,
    },
    listContainerWithTabBar: {
      flex: 1,
    },
    tabBarContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },

    listHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 8,
      marginTop: 12,
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
      borderRadius: 4,
      marginRight: 8,
    },
    skeletonLeverage: {
      borderRadius: 4,
    },
    skeletonVolume: {
      borderRadius: 4,
    },
    skeletonRightSection: {
      alignItems: 'flex-end',
      flex: 1,
    },
    skeletonPrice: {
      borderRadius: 4,
      marginBottom: 6,
    },
    skeletonChange: {
      borderRadius: 4,
    },
    animatedListContainer: {
      flex: 1,
    },
    searchContainer: {
      marginHorizontal: 16,
      marginTop: 16,
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
      paddingVertical: 8,
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
