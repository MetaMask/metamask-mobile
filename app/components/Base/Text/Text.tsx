import React from 'react';
import { Text as RNText } from 'react-native';
import { useTheme } from '../../../util/theme';
import styles from './Text.styles';

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
  const style = styles(colors);

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
