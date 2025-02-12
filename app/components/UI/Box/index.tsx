import { JSXElement } from '@metamask/snaps-sdk/jsx';
import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { TextColor } from '../../../component-library/components/Texts/Text';
import {
  AlignItems,
  Display,
  FlexDirection,
  JustifyContent,
  TextAlign,
} from '../../Snaps/SnapUIRenderer/components/box.types';

const styles = StyleSheet.create({
  container: {
    padding: 16,
    margin: 8,
  },
  overflowHidden: { overflow: 'hidden' },
});

const getBoxStyles = (props: {
  display?: Display;
  flexDirection?: FlexDirection;
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  textAlign?: TextAlign;
  gap?: number;
  color?: TextColor;
}) => {
  const {
    display,
    flexDirection,
    justifyContent,
    alignItems,
    textAlign,
    color,
    gap,
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
    },
  });
};

export default styles;

export interface BoxProps extends ViewProps {
  children: string | JSXElement | React.ReactNode;
  display?: Display;
  flexDirection?: FlexDirection;
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  textAlign?: TextAlign;
  gap?: number;
  color?: TextColor;
  ref?: React.Ref<View>;
  testID?: string;
}

export const Box: React.FC<BoxProps> = React.forwardRef(
  ({ children, ...props }, ref) => (
    <View
      ref={ref}
      style={[getBoxStyles(props).dynamicStyles, props.style]}
      {...props}
      testID={props.testID}
    >
      {children}
    </View>
  ),
);
