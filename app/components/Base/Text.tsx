import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { fontStyles } from '../../styles/common';
import { useTheme } from '../../util/theme';
import { Colors } from '../../util/theme/models';

interface TextProps extends React.ComponentPropsWithoutRef<typeof RNText> {
  reset?: boolean;
  centered?: boolean;
  right?: boolean;
  bold?: boolean;
  green?: boolean;
  black?: boolean;
  blue?: boolean;
  red?: boolean;
  grey?: boolean;
  orange?: boolean;
  infoModal?: boolean;
  noMargin?: boolean;
  primary?: boolean;
  muted?: boolean;
  disclaimer?: boolean;
  modal?: boolean;
  small?: boolean;
  big?: boolean;
  bigger?: boolean;
  upper?: boolean;
  link?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    text: {
      ...fontStyles.normal,
      color: colors.text.default,
      marginVertical: 2,
      fontSize: 14,
    },
    centered: {
      textAlign: 'center',
    },
    right: {
      textAlign: 'right',
    },
    red: {
      color: colors.error.default,
    },
    orange: {
      color: colors.secondary.default,
    },
    black: {
      color: colors.text.default,
    },
    bold: fontStyles.bold,
    blue: {
      color: colors.primary.default,
    },
    green: {
      color: colors.success.default,
    },
    grey: {
      color: colors.text.alternative,
    },
    primary: {
      color: colors.text.default,
    },
    muted: {
      color: colors.text.muted,
    },
    small: {
      fontSize: 12,
    },
    big: {
      fontSize: 16,
    },
    bigger: {
      fontSize: 18,
    },
    upper: {
      textTransform: 'uppercase',
    },
    disclaimer: {
      fontStyle: 'italic',
      letterSpacing: 0.15,
    },
    modal: {
      color: colors.text.default,
      fontSize: 16,
      lineHeight: 22.4, // 1.4 * fontSize
    },
    infoModal: {
      lineHeight: 20,
      marginVertical: 6,
    },
    link: {
      color: colors.primary.default,
    },
    strikethrough: {
      textDecorationLine: 'line-through',
    },
    underline: {
      textDecorationLine: 'underline',
    },
    noMargin: {
      marginVertical: 0,
    },
  });

const Text: React.FC<TextProps> = ({
  reset,
  centered,
  right,
  bold,
  green,
  black,
  blue,
  grey,
  red,
  orange,
  primary,
  muted,
  small,
  big,
  bigger,
  upper,
  modal,
  infoModal,
  disclaimer,
  link,
  strikethrough,
  underline,
  noMargin,
  style: externalStyle,
  ...props
}: TextProps) => {
  const { colors } = useTheme();
  const style = createStyles(colors);

  return (
    <RNText
      style={[
        !reset && style.text,
        centered && style.centered,
        right && style.right,
        bold && style.bold,
        green && style.green,
        black && style.black,
        blue && style.blue,
        grey && style.grey,
        red && style.red,
        orange && style.orange,
        black && style.black,
        primary && style.primary,
        muted && style.muted,
        disclaimer && [style.small, style.disclaimer],
        small && style.small,
        big && style.big,
        bigger && style.bigger,
        upper && style.upper,
        modal && style.modal,
        infoModal && style.infoModal,
        link && style.link,
        strikethrough && style.strikethrough,
        underline && style.underline,
        noMargin && style.noMargin,
        externalStyle,
      ]}
      {...props}
    />
  );
};

export default Text;
