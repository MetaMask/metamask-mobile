// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// Internal dependencies.
import { CoinStyleSheetVars } from './Coin.types';

/**
 * Style sheet function for Coin component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { vars: CoinStyleSheetVars }) => {
  const {
    vars: { style, size },
  } = params;
  const sizeAsNum = Number(size);

  return StyleSheet.create({
    base: Object.assign(
      {
        height: sizeAsNum,
        width: sizeAsNum,
        borderRadius: sizeAsNum / 2,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;
