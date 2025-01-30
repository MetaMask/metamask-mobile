import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    bottomSheetDialogAnimatedView: {
      backgroundColor: theme.colors.background.alternative,
      display: 'flex',
      paddingTop: 24,
    },
    scrollView: {
      paddingHorizontal: 16,
    },
  });
};

export default styleSheet;
