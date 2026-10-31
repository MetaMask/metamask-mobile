import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

/** Returns the legacy font size breakpoints used by confirmation amounts. */
export const getFontSizeForConfirmationAmount = (length: number): number => {
  if (length <= 8) return 88;
  if (length <= 13) return 40;
  if (length <= 18) return 30;
  return 20;
};

const styleSheet = (params: {
  theme: Theme;
  vars: { amountLength: number; hasAlert: boolean; disabled: boolean };
}) => {
  const fontSize = getFontSizeForConfirmationAmount(params.vars.amountLength);

  return StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 88,
    },
    input: {
      textAlign: 'center',
      fontSize,
      lineHeight: fontSize,
      color: params.vars.hasAlert
        ? params.theme.colors.error.default
        : params.vars.disabled
          ? params.theme.colors.text.muted
          : params.theme.colors.text.default,
    },
    assistive: {
      color: params.theme.colors.text.muted,
    },
    cursor: {
      width: 1,
      height: Math.round(fontSize * 0.95),
      backgroundColor: params.theme.colors.text.muted,
      transform: [{ translateY: Math.round(fontSize * -0.04) }],
    },
    skeleton: {
      borderRadius: 8,
    },
    alertMessage: {
      textAlign: 'center',
      marginTop: 16,
      color: params.theme.colors.error.default,
    },
  });
};

export default styleSheet;
