import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    assetHeaderContainer: {
      gap: 16,
      paddingBottom: 36,
    },
    measurementContainer: {
      position: 'relative',
    },
    hiddenMeasurementContent: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      opacity: 0,
    },
    assetHeaderContainerHorizontal: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    assetHeaderContainerStacked: {
      flexDirection: 'column',
    },
    assetContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    assetContainerHorizontal: {
      flex: 1,
      minWidth: 0,
    },
    assetContainerHorizontalInput: {
      justifyContent: 'flex-end',
    },
    assetContainerHorizontalOutput: {
      justifyContent: 'flex-start',
    },
    assetContainerStacked: {
      width: '100%',
    },
    assetInfo: {
      minWidth: 0,
      overflow: 'hidden',
    },
    assetInfoHorizontal: {
      flexShrink: 1,
    },
    assetInfoStacked: {
      flex: 1,
    },
    assetDirectionIcon: {
      flexShrink: 0,
      marginHorizontal: 8,
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
