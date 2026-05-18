import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    floatingBackground: {
      backgroundColor: colors.background.section,
      marginHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    defaultFlashFloating: {
      padding: 16,
      flexDirection: 'row',
      flex: 1,
      borderRadius: 8,
    },
    flashLabel: {
      flex: 1,
      flexDirection: 'column',
    },
    flashText: {
      flex: 1,
      lineHeight: 18,
    },
    flashTitle: {
      flex: 1,
      marginBottom: 2,
      lineHeight: 18,
    },
    flashIcon: {
      marginRight: 15,
    },
    closeTouchable: {
      flex: 0.1,
      flexDirection: 'column',
      alignItems: 'flex-end',
    },
    closeIcon: {
      flex: 1,
      color: colors.icon.default,
      alignItems: 'flex-start',
      marginTop: -8,
    },
  });
};

export default styleSheet;
