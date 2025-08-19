import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../../util/theme/models';

export const styleSheet = (params: {
  theme: Theme;
  vars: { continueDisabled: boolean };
}) => {
  const {
    theme,
    vars: { continueDisabled },
  } = params;

  return StyleSheet.create({
    continueButton: {
      backgroundColor: continueDisabled
        ? theme.colors.error.default
        : theme.colors.primary.default,
      marginBottom: 6,
    },
  });
};
