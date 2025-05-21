import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { isFlatConfirmation: boolean };
}) => {
  const { theme, vars } = params;
  const { isFlatConfirmation } = vars;

  return StyleSheet.create({
    base: {
      paddingBottom: 16,
      paddingTop: isFlatConfirmation ? 16 : 0,
    },
    subtitle: {
      textAlign: 'center',
      color: theme.colors.text.alternative,
    },
    title: {
      paddingTop: 8,
    },
    titleText: {
      textAlign: 'center',
    },
  });
};

export default styleSheet;
