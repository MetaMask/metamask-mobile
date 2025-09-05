import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../../util/theme/models';

export const getBackgroundColor = (
  theme: Theme,
  amountError: boolean,
  submitDisabled: boolean,
) => {
  let backgroundColor = theme.colors.primary.default;
  if (amountError) {
    backgroundColor = theme.colors.error.default;
  } else if (submitDisabled) {
    backgroundColor = theme.colors.primary.muted;
  }
  return backgroundColor;
};

export const styleSheet = (params: {
  theme: Theme;
  vars: { amountError: boolean; submitDisabled: boolean };
}) => {
  const {
    theme,
    vars: { amountError, submitDisabled },
  } = params;

  return StyleSheet.create({
    continueButton: {
      backgroundColor: getBackgroundColor(theme, amountError, submitDisabled),
      marginBottom: 12,
    },
  });
};
