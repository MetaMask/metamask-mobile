import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    bottomSheetBackground: {
      backgroundColor: theme.colors.background.alternative,
    },
  });
};

export default createStyles;
