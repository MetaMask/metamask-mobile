import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';
import { fontStyles } from '../../../styles/common';

/**
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const {
    theme: { colors },
  } = params;
  return StyleSheet.create({
    positionTypeLabel: {
      color: colors.text.alternative,
      fontWeight: 'bold',
      ...fontStyles.normal,
    },
    underlyingBalancesWrapper: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    assetSymbolText: {
      marginLeft: 20,
    },
    balance: {
      flex: 1,
      alignItems: 'flex-end',
    },
    alternativeText: {
      color: colors.text.alternative,
      ...fontStyles.normal,
    },
  });
};

export default styleSheet;
