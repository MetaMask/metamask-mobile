import { Platform, StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { amountFontSize: number };
}) => {
  const { theme, vars } = params;
  const { amountFontSize } = vars;

  return StyleSheet.create({
    content: {
      flex: 1,
    },
    centerGroup: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      flex: 1,
    },
    amountContainer: {
      alignItems: 'center',
      gap: 16,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    cursor: {
      width: 1,
      height: Math.round(amountFontSize * 0.95),
      backgroundColor: theme.colors.text.muted,
      // Android renders glyphs lower than iOS in a line box equal to fontSize.
      transform: [
        {
          translateY: Math.round(
            amountFontSize * (Platform.OS === 'android' ? 0.02 : -0.04),
          ),
        },
      ],
    },
    actionSection: {
      paddingBottom: 16,
      gap: 16,
    },
    poweredByText: {
      textAlign: 'center',
      color: theme.colors.text.alternative,
    },
    centeredText: {
      textAlign: 'center' as const,
    },
  });
};

export default styleSheet;
