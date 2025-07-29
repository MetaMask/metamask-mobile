import { Theme } from '../../../../../../util/theme/models';
import { StyleSheet } from 'react-native';
import Device from '../../../../../../util/device';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  const screenWidth = Device.getDeviceWidth();
  const containerPadding = 15;
  const gap = 5;
  const cellCount = 6;
  const availableWidth = screenWidth - 2 * containerPadding;
  const boxSize = Math.floor(
    (availableWidth - (cellCount - 1) * gap) / cellCount,
  );
  const finalBoxSize = Math.max(40, Math.min(50, boxSize));

  return StyleSheet.create({
    title: {
      marginTop: 24,
      fontWeight: 'bold',
    },
    description: {
      marginTop: 8,
      color: theme.colors.text.alternative,
    },
    codeFieldRoot: {
      marginTop: 8,
      gap: 5,
    },
    cellRoot: {
      width: finalBoxSize,
      height: finalBoxSize,
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
    },
    resendButtonContainer: {
      flexDirection: 'row',
      marginTop: 12,
    },
    resendButtonText: {
      color: theme.colors.text.alternative,
      marginRight: 4,
    },
    inlineLink: {
      color: theme.colors.text.alternative,
      marginLeft: 4,
      textDecorationLine: 'underline',
    },
    footerContent: {
      gap: 8,
    },
  });
};

export default styleSheet;
