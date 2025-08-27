import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../../util/theme/models';

export const styleSheet = (params: {
  theme: Theme;
  vars: { amountError: boolean; submitDisabled: boolean };
}) => {
  const {
    theme,
    vars: { amountError, submitDisabled },
  } = params;

  let backgroundColor = theme.colors.primary.default;
  if (amountError) {
    backgroundColor = theme.colors.error.default;
  } else if (submitDisabled) {
    backgroundColor = theme.colors.primary.muted;
  }
  return StyleSheet.create({
    continueButton: {
      backgroundColor,
      marginBottom: 12,
    },
  });
};
