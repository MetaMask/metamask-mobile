// Third party dependencies.
import { StyleSheet, ImageStyle } from 'react-native';

// Internal dependencies.
import { IconStyleSheetVars } from './Icon.types';

/**
 * Style sheet function for Icon component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { vars: IconStyleSheetVars }) => {
  const {
    vars: { style, size },
  } = params;
  const sizeAsNum = Number(size);

  return StyleSheet.create({
    container: Object.assign(
      {
        height: sizeAsNum,
        width: sizeAsNum,
      } as ImageStyle,
      style,
    ) as ImageStyle,
  });
};

export default styleSheet;
