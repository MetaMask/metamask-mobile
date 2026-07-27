import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    setting: {
      marginTop: 0,
      paddingVertical: 16,
    },
    desc: {
      marginTop: 8,
      lineHeight: 20,
    },
    picker: {
      marginTop: 12,
    },
    pickerTrigger: {
      backgroundColor: colors.background.muted,
      borderRadius: 12,
      borderWidth: 0,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    selectedLabel: {
      flex: 1,
    },
  });
};

export default styleSheet;
