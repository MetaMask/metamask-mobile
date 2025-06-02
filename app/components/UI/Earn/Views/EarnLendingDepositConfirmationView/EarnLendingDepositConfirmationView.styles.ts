import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    pageContainer: {
      justifyContent: 'space-between',
      height: '100%',
      backgroundColor: colors.background.alternative,
    },
    contentContainer: {
      paddingHorizontal: 16,
    },
  });
};

export default styleSheet;
