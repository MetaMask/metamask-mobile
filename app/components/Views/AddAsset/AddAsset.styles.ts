import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';
import Device from '../../../util/device';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    base: {
      paddingHorizontal: 32,
    },
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
      alignItems: 'center',
      marginTop: 10,
    },
    tabUnderlineStyle: {
      height: 2,
      backgroundColor: colors.primary.default,
    },
    tabBar: {
      borderColor: colors.border.muted,
    },
    tabStyle: {
      paddingBottom: 0,
      paddingVertical: 8,
    },
    textStyle: {
      ...params.theme.typography.sBodyMD,
      fontWeight: '500',
    },
    networkImageContainer: {
      position: 'absolute',
      right: 0,
    },
  });
};
export default styleSheet;
