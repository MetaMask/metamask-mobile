import { StyleSheet, ViewStyle } from 'react-native';
import { BaseAvatarStyleSheetVars } from './BaseAvatar.types';

/**
 * Style sheet function for BaseAvatar component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { vars: BaseAvatarStyleSheetVars }) => {
  const {
    vars: { style, size },
  } = params;
  const sizeAsNum = Number(size);

  return StyleSheet.create({
    container: Object.assign(
      {
        height: sizeAsNum,
        width: sizeAsNum,
        borderRadius: sizeAsNum / 2,
        overflow: 'hidden',
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;
