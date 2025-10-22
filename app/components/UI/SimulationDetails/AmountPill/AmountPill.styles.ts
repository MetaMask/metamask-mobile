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

  let textColor: string | undefined;

  if (isApproval) {
    textColor = colors.text.default;
  } else {
    textColor = isNegative ? colors.error.alternative : colors.success.default;
  }

  return StyleSheet.create({
    base: {
      ...sharedStyles.pill,
    },
    label: {
      color: textColor,
      flexShrink: 1,
    },
  });
};

export default styleSheet;
