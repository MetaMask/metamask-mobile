import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';
import Device from '../../../util/device';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    bottomSheetWrapper: {
      alignItems: 'flex-start',
    },
    bottomSheetWrapperContent: {
      maxHeight: Device.getDeviceHeight() * 0.7,
    },
    bottomSheetTitle: {
      alignSelf: 'center',
      paddingTop: 16,
      paddingBottom: 16,
    },
    bottomSheetText: {
      width: '100%',
    },
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    infoWrapper: {
      paddingTop: 16,
    },
    infoBanner: {
      alignSelf: 'stretch',
      marginHorizontal: 16,
      borderRadius: 4,
    },
    tabContainer: {
      flex: 1,
    },
    networkImageContainer: {
      position: 'absolute',
      right: 0,
    },
    networkSelectorWrapper: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    networkSelectorContainer: {
      borderWidth: 1,
      marginBottom: 16,
      marginTop: 4,
      borderColor: colors.border.default,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    networkSelectorText: {
      color: colors.text.default,
      fontSize: 16,
    },
    overlappingAvatarsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      position: 'absolute',
      paddingHorizontal: 16,
      right: 0,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    networkSelectorAvatarContainer: {
      marginRight: 8,
    },
  });
};
export default styleSheet;
