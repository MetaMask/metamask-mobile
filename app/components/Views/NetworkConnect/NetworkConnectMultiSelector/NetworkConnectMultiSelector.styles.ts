import { StyleSheet } from 'react-native';
import { isMultichainVersion1Enabled } from '../../../../util/networks';
import Device from '../../../../util/device';

const styleSheet = (params: {
  vars: { isRenderedAsBottomSheet: boolean | undefined };
}) => {
  const { vars } = params;
  return StyleSheet.create({
    bottomSheetContainer: {
      height: Device.isAndroid() || Device.isMediumDevice() ? '99%' : '100%',
    },
    bodyContainer: {
      paddingHorizontal: 22,
      paddingBottom: 4,
    },
    buttonsContainer: {
      marginTop: isMultichainVersion1Enabled ? 0 : 24,
      marginBottom: vars.isRenderedAsBottomSheet ? 0 : 16,
    },
    updateButtonContainer: { flexDirection: 'row' },
    buttonPositioning: { flex: 1 },
    disabledOpacity: {
      opacity: 0.5,
    },
    selectAllContainer: {
      marginLeft: 0,
      marginVertical: 12,
    },
    disconnectAll: {
      flexDirection: 'column',
      alignItems: 'center',
    },
    helpText: {
      margin: 16,
    },
    disconnectAllButton: {
      flexDirection: 'row',
    },
  });
};

export default styleSheet;
