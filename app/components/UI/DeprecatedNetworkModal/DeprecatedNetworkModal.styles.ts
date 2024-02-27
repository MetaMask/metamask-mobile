import Device from '../../../util/device';
import { StyleSheet, TextStyle } from 'react-native';
import { Theme } from '../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { typography } = theme;

  return StyleSheet.create({
    centeredTitle: {
      marginTop: 16,
      marginBottom: 8,
      fontSize: 18,
      textAlign: 'center',
    },
    centeredDescription: {
      fontSize: 14,
      textAlign: 'center',
      paddingRight: 16,
      paddingLeft: 16,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    button: {
      flex: 1,
      marginLeft: 16,
      marginRight: 16,
      marginTop: 24,
      marginBottom: Device.isAndroid() ? 21 : 0,
    },
    buttonLabel: {
      ...typography.lBodySMMedium,
    } as TextStyle,
  });
};

export default styleSheet;
