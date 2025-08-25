import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { isSelected?: boolean };
}) => {
  const { theme, vars } = params;
  const { isSelected } = vars;
  return StyleSheet.create({
    gasFeeTokenListItem: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: isSelected ? theme.colors.background.muted : undefined,
      padding: 8,
    },
    gasFeeTokenListItemContent: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 8,
    },
    gasFeeTokenListItemTextContainer: {
      paddingLeft: 8,
    },
    gasFeeTokenListItemSymbol: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    gasFeeTokenListItemSymbolText: {
      color: theme.colors.text.default,
      padding: 0,
    },
    gasFeeTokenListItemAmountContainer: {
      alignItems: 'flex-end',
      paddingRight: 8,
    },
    warningIndicator: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      borderColor: theme.colors.border.default,
      padding: 4,
      gap: 1,
    },
    gasFeeTokenListItemSelectedIndicator: {
      borderRadius: 8,
      backgroundColor: theme.colors.info.default,
      width: 4,
      position: 'absolute',
      alignSelf: 'center',
      left: 4,
      height: 50,
    },
  });
};

export default styleSheet;
