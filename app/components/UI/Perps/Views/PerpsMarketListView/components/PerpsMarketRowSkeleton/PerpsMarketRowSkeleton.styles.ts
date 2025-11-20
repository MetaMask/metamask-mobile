import { StyleSheet } from 'react-native';

/**
 * Styles for PerpsMarketRowSkeleton component
 */
const styleSheet = () =>
  StyleSheet.create({
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
  });

export default styleSheet;
