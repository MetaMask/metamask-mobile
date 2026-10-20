import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

export function getFontSizeForInputLength(length: number): number {
  if (length <= 8) return 64;

  if (length <= 14) {
    return Math.round(64 - (length - 8) * (40 / 6));
  }

  return Math.max(12, Math.round(24 - (length - 14) * 2));
}

const styleSheet = (params: {
  theme: Theme;
  vars: { amountLength: number; hasAlert: boolean; disabled: boolean };
}) => {
  const fontSize = getFontSizeForInputLength(params.vars.amountLength);

  return StyleSheet.create({
    amount: {
      flexShrink: 1,
    },
    container: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 70,
    },
    displayContainer: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      maxWidth: '100%',
      minHeight: 70,
      paddingHorizontal: 24,
    },
    input: {
      textAlign: 'center',
      fontSize,
      lineHeight: fontSize * 1.1,
      fontWeight: '500',
      color: params.vars.hasAlert
        ? params.theme.colors.error.default
        : params.vars.disabled
          ? params.theme.colors.text.muted
          : params.theme.colors.text.default,
    },
    cursor: {
      width: 1,
      height: Math.round(fontSize * 0.7),
      backgroundColor: params.theme.colors.primary.default,
      transform: [{ translateY: Math.round(fontSize * -0.08) }],
    },
    alertMessage: {
      textAlign: 'center',
      marginTop: 16,
      color: params.theme.colors.error.default,
    },
  });
};

export default styleSheet;
