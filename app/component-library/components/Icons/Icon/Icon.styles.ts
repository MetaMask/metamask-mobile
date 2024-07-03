// Third party dependencies.
import { StyleSheet, ImageStyle } from 'react-native';

/**
 * Style sheet function for Icon component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const styleSheet = (params: { vars: any }) => {
  const {
    vars: { style, size },
  } = params;
  const sizeAsNum = Number(size);

  return StyleSheet.create({
    icon: Object.assign(
      {
        height: sizeAsNum,
        width: sizeAsNum,
      } as ImageStyle,
      style,
    ) as ImageStyle,
  });
};

export default styleSheet;
