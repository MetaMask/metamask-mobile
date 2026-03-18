import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    bottomSheetDialogSheet: {
      backgroundColor: theme.colors.background.alternative,
    },
    flatContainer: {
      backgroundColor: theme.colors.background.alternative,
    },
  });
};

export default styleSheet;
