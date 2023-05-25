import { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors, typography } = theme;
  return StyleSheet.create({
    buttonLabel: {
      color: colors.primary.default,
      paddingTop: 8,
      textAlign: 'center',
    },
    content: {
      color: colors.text.alternative,
    },
    disclaimer: {
      ...typography.sBodyXS,
      color: colors.text.alternative,
      paddingTop: 16,
    } as TextStyle,
  });
};

export default styleSheet;
