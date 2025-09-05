import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export const timeDurationSelectorStyleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      paddingRight: 16,
      paddingVertical: 12,
    },
    durationButtonsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    durationButton: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    durationButtonActive: {
      backgroundColor: colors.background.muted,
    },
    durationButtonInactive: {
      backgroundColor: colors.background.default,
    },
    durationButtonPressed: {
      opacity: 0.7,
    },
    durationButtonText: {
      textAlign: 'center',
    },
    durationButtonTextActive: {
      color: colors.text.default, // White text
    },
    durationButtonTextInactive: {
      color: colors.text.muted, // Gray text
    },
    gearButton: {
      width: 40,
      height: 40,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 12,
    },
    gearButtonPressed: {
      opacity: 0.7,
      backgroundColor: colors.background.pressed,
    },
  });
};
