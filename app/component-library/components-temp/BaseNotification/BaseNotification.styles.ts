import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

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
      rowGap: 2,
    },
    flashText: {
      flex: 1,
      lineHeight: 18,
    },
    flashTitle: {
      flex: 1,
    },
    flashIcon: {
      marginRight: 15,
    },
  });
};

export default styleSheet;
