import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    assetHeaderContainer: {
      gap: 16,
      paddingBottom: 36,
    },
    assetContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    assetInfo: {
      flex: 1,
    },
    assetInfoSkeleton: {
      gap: 6,
      justifyContent: 'center',
    },
    assetAmount: {
      fontSize: 20,
      fontWeight: '500',
      color: theme.colors.text.default,
    },
    skeletonBorderRadius: {
      borderRadius: 8,
    },
    skeletonAvatar: {
      borderRadius: 999,
    },
  });
};

export default styleSheet;
