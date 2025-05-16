import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { hasProgressBar: boolean };
}) => {
  const { theme, vars } = params;
  const { hasProgressBar = false } = vars;

  return StyleSheet.create({
    footerContainer: {
      backgroundColor: theme.colors.primary.inverse,
      paddingTop: hasProgressBar ? 32 : 16,
    },
    footerButtonsContainer: {
      backgroundColor: theme.colors.primary.inverse,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    bottomTextContainer: {
      flexDirection: 'column',
      justifyContent: 'center',
      marginBottom: 12,
    },
    bottomTextContainerLine: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    linkText: {
      textDecorationLine: 'underline',
    },
  });
};

export default styleSheet;
