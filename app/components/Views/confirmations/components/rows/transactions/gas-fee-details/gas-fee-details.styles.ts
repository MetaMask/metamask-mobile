import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../../../../styles/common';
import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (
  params: {
    theme: Theme;
    vars: { isEIP1559: boolean | undefined };
  },
) => {
  const { theme, vars } = params;
  const isEIP1559 = vars.isEIP1559;

  return StyleSheet.create({
    primaryValue: {
      ...fontStyles.normal,
      color: theme.colors.text.default,
      fontSize: 14,
      textDecorationLine: isEIP1559 ? 'underline' : 'none',
    },
    secondaryValue: {
      ...fontStyles.normal,
      color: theme.colors.text.alternative,
      fontSize: 14,
      marginRight: 8,
      textDecorationLine: isEIP1559 ? 'underline' : 'none',
    },
    valueContainer: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
    },
  });
};

export default styleSheet;
