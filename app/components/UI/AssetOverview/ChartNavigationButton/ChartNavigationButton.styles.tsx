import { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';

const styleSheet = (params: {
  theme: Theme;
  vars: {
    selected: boolean;
  };
}) => {
  const {
    theme,
    vars: { selected },
  } = params;
  const { colors, typography } = theme;
  return StyleSheet.create({
    button: {
      backgroundColor: selected
        ? colors.primary.default
        : colors.background.default,
      borderRadius: 40,
      paddingVertical: 2,
      paddingHorizontal: 8,
      // compensates for letter spacing
      paddingLeft: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      ...typography.sBodySM,
      letterSpacing: 3,
      color: selected ? colors.background.default : colors.primary.default,
      textAlign: 'center',
    } as TextStyle,
  });
};

export default styleSheet;
