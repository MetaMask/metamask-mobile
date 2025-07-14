import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';
import sharedStyles from '../shared.styles';

const styleSheet = (params: {
  theme: Theme;
  vars: { isApproval: boolean; isNegative: boolean };
}) => {
  const { theme, vars } = params;
  const { colors } = theme;
  const { isNegative, isApproval } = vars;

  let backgroundColor: string | undefined;
  let textColor: string | undefined;

  if (isApproval) {
    backgroundColor = colors.background.muted;
    textColor = colors.text.default;
  } else {
    backgroundColor = isNegative ? colors.error.muted : colors.success.muted;
    textColor = isNegative ? colors.error.alternative : colors.success.default;
  }

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
