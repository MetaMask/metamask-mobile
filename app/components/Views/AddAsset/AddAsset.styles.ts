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
      alignItems: 'center',
      marginTop: 10,
    },
    tabContainer: {
      paddingHorizontal: 16,
      flex: 1,
    },
    networkImageContainer: {
      position: 'absolute',
      right: 0,
    },
  });
};
export default styleSheet;
