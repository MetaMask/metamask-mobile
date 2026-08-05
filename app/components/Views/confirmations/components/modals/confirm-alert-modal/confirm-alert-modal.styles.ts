import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';
import Device from '../../../../../../util/device';

const styleSheet = (params: {
  theme: Theme;
  vars: { isPureBlack: boolean };
}) => {
  const { theme, vars } = params;
  const { isPureBlack } = vars;
  const { colors } = theme;

  return StyleSheet.create({
    // TODO(Pure Black): Remove once MMDS ships pure-black-aware surface tokens / bg-elevated.
    // Drop usePureBlack() and the isPureBlack var. Use: backgroundColor: theme.colors.background.default
    modalContainer: {
      backgroundColor: isPureBlack
        ? theme.colors.background.section
        : theme.colors.background.default,
      borderWidth: isPureBlack ? 1 : 0,
      borderColor: isPureBlack ? colors.border.muted : undefined,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
      alignItems: 'center',
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 16,
    },
    headerContainer: {
      paddingTop: 16,
    },
    footerButton: {
      flex: 1,
    },
    buttonsContainer: {
      flexDirection: 'row',
      paddingVertical: 16,
    },
    buttonDivider: {
      width: 8,
    },
    headerText: {
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 16,
    },
    message: {
      textAlign: 'center',
      padding: 12,
    },
    checkboxContainer: {
      marginTop: 12,
      backgroundColor: theme.colors.error.muted,
      borderRadius: 8,
      marginVertical: 8,
      padding: 16,
      flexDirection: 'row',
    },
    reviewAlertsLink: {
      alignSelf: 'center',
    },
    checkboxText: {
      marginLeft: 8,
      flex: 1,
      color: theme.colors.text.default,
    },
  });
};

export default styleSheet;
