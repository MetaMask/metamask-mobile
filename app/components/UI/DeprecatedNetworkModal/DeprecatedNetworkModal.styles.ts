import { Theme } from '@metamask/design-tokens';
import Device from '../../../util/device';
import { StyleSheet } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    screen: { justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    notch: {
      width: 40,
      height: 4,
      borderRadius: 4,
      backgroundColor: colors.border.muted,
      marginTop: 4,
      alignSelf: 'center',
      marginBottom: 16,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    centeredTitle: {
      fontSize: 18,
      textAlign: 'center',
    },
    centeredDescription: {
      fontSize: 14,
      textAlign: 'center',
      marginTop: 8,
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
      fontSize: 14,
    },
  });
};

export default styleSheet;
