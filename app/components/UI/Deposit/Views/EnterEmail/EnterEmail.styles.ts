import { Theme } from '../../../../../util/theme/models';
import { StyleSheet } from 'react-native';
import Device from '../../../../../util/device';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    subtitle: {
      marginBottom: 20,
    },
    field: {
      flex: 1,
      marginBottom: Device.isAndroid() ? 0 : 10,
      flexDirection: 'column',
    },
    label: {
      marginBottom: 6,
    },
    ctaWrapper: {
      marginTop: 20,
    },
    codeFieldRoot: {
      marginTop: 40,
      marginLeft: 'auto',
      marginRight: 'auto',
    },
    cellRoot: {
      margin: 5,
      width: 50,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background.muted,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      borderRadius: 8,
    },
    cellText: {
      color: theme.colors.text.default,
      fontSize: 24,
      lineHeight: 30,
      textAlign: 'center',
      fontWeight: 'bold',
    },
    focusCell: {
      borderColor: theme.colors.info.default,
      borderBottomWidth: 2,
    },
  });
};

export default styleSheet;
