import React from 'react';
import {
  Text as RNText,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from 'react-native';

/**
 * TEMPORARY prototype — raw RN Text so design-system Inter classes cannot
 * override Oswald via fontWeight / font-default-* mapping.
 */
export const OswaldText = ({
  style,
  children,
  ...props
}: TextProps & { style?: StyleProp<TextStyle> }) => (
  <RNText allowFontScaling={false} {...props} style={style}>
    {children}
  </RNText>
);
