// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';
import Device from '../../../util/device';

/**
 * Style sheet function for FoxLoader component.
 *
 * @param params Style sheet params.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    ctas: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: 20,
      rowGap: Device.isMediumDevice() ? 16 : 24,
    },
    loaderContainer: {
      position: 'absolute',
      bottom: 80,
      left: 0,
      right: 0,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
  });
};

export default styleSheet;
