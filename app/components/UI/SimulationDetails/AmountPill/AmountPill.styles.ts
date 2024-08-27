import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';
import sharedStyles from '../shared.styles';

const styleSheet = (params: {
  theme: Theme;
  vars: { isNegative: boolean };
}) => {
  const { theme, vars } = params;
  const { colors } = theme;
  const { isNegative } = vars;

  const backgroundColor = isNegative
    ? colors.error.muted
    : colors.success.muted;

  const textColor = isNegative
    ? colors.error.alternative
    : colors.success.default;

  return StyleSheet.create({
    base: {
      ...sharedStyles.pill,
      backgroundColor,
    },
    label: {
      color: textColor,
      flexShrink: 1,
    },
  });
};

export default styleSheet;
