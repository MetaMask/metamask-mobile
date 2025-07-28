import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { hasGasFeeTokens: boolean };
}) => {
  const { theme, vars } = params;
  const { hasGasFeeTokens } = vars;
  return StyleSheet.create({
    gasFeeTokenButton: {
      backgroundColor: theme.colors.background.alternative,
      alignItems: 'center',
      display: 'flex',
      flexDirection: 'row',
      gap: 4,
      borderRadius: 16,
      cursor: hasGasFeeTokens ? 'pointer' : undefined,
      paddingTop: 2,
      paddingBottom: 2,
      paddingLeft: 6,
      paddingRight: 6,
    },
  });
};

export default styleSheet;
