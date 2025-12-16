import { StyleSheet } from 'react-native';
import { Colors } from 'app/util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    stakeButton: {
      flexDirection: 'row',
    },
    dot: {
      marginLeft: 2,
      marginRight: 2,
    },
    controlIconButton: {
      backgroundColor: colors.background.default,
    },
    balanceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    loaderWrapper: {
      flexDirection: 'column',
      gap: 4,
    },
    networkImageContainer: {
      position: 'absolute',
      right: 0,
    },
    wrapperSkeleton: {
      backgroundColor: colors.background.default,
    },
    skeletonItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    skeletonTextContainer: {
      flex: 1,
      marginLeft: 12,
    },
    skeletonValueContainer: {
      alignItems: 'flex-end',
    },
  });

export default createStyles;
