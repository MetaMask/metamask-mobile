import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { TextColor } from '../../../component-library/components/Texts/Text';
import {
  AlignItems,
  Display,
  FlexDirection,
  JustifyContent,
  TextAlign,
} from './box.types';

const getBoxStyles = (props: {
  display?: Display;
  flexDirection?: FlexDirection;
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  textAlign?: TextAlign;
  gap?: number;
  color?: TextColor;
  backgroundColor?: string;
}) => {
  const {
    display,
    flexDirection,
    justifyContent,
    alignItems,
    textAlign,
    color,
    gap,
    backgroundColor,
  } = props;
  return StyleSheet.create({
    dynamicStyles: {
      ...(display && { display: display as 'none' | 'flex' }),
      ...(flexDirection && { flexDirection }),
      ...(justifyContent && { justifyContent }),
      ...(alignItems && { alignItems }),
      ...(textAlign && { textAlign }),
      ...(color && { color }),
      ...(gap && { gap }),
      ...(backgroundColor && { backgroundColor }),
    },
  });
};

export interface BoxProps extends ViewProps {
  children?: string | React.ReactNode;
  display?: Display;
  flexDirection?: FlexDirection;
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  textAlign?: TextAlign;
  gap?: number;
  color?: TextColor;
  backgroundColor?: string;
  ref?: React.Ref<View>;
  testID?: string;
}

export const Box = React.forwardRef<View, BoxProps>(
  ({ children, ...props }, ref) => (
    <View
      {...props}
      ref={ref}
      style={[getBoxStyles(props).dynamicStyles, props.style]}
      testID={props.testID}
    >
      {children}
    </View>
  ),
);
