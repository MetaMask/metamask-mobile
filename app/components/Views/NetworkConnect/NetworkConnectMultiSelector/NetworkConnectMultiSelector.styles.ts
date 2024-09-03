// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';
import { isMutichainVersion1Enabled } from '../../../../util/networks';

/**
 * Style sheet function for AccountConnectMultiSelector screen.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  return StyleSheet.create({
    bottomSheetContainer: {
      height: '100%',
    },
    bodyContainer: {
      paddingHorizontal: 16,
    },
    buttonsContainer: {
      marginTop: isMutichainVersion1Enabled ? 0 : 24,
      marginBottom: 16,
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
