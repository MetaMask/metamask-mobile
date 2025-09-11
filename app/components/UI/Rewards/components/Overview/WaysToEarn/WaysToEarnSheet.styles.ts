import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    sheet: {
      marginVertical: 16,
      marginHorizontal: 16,
    },
    bottomSheetContent: {
      backgroundColor: colors.background.default,
      display: 'flex',
    },
  });
};

export default styleSheet;
