import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { isNonceChangeDisabled: boolean };
}) => {
  const {
    theme,
    vars: { isNonceChangeDisabled },
  } = params;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.alternative,
      padding: 16,
    },
    nonceText: isNonceChangeDisabled
      ? {
          color: theme.colors.text.default,
        }
      : {
          color: theme.colors.primary.default,
        },
    dataScrollContainer: {
      height: 200,
    },
  });
};

export default styleSheet;
