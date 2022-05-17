import React from 'react';
import PropTypes from 'prop-types';
import { Text as RNText, StyleSheet } from 'react-native';
import { fontStyles } from '../../styles/common';
import { useAppThemeFromContext, mockTheme } from '../../util/theme';

const createStyles = (colors) =>
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

const Text = ({
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
  style: externalStyle,
  noMargin,
  ...props
}) => {
  const { colors } = useAppThemeFromContext() || mockTheme;
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

Text.defaultProps = {
  reset: false,
  centered: false,
  right: false,
  bold: false,
  green: false,
  black: false,
  blue: false,
  red: false,
  primary: false,
  muted: false,
  disclaimer: false,
  modal: false,
  small: false,
  big: undefined,
  bigger: false,
  upper: false,
  link: false,
  strikethrough: false,
  underline: false,
  style: undefined,
};

Text.propTypes = {
  /**
   * Removes teh default style
   */
  reset: PropTypes.bool,
  /**
   * Align text to center
   */
  centered: PropTypes.bool,
  /**
   * Align text to right
   */
  right: PropTypes.bool,
  /**
   * Makes text bold
   */
  bold: PropTypes.bool,
  /**
   * Makes text green
   */
  green: PropTypes.bool,
  /**
   * Makes text black
   */
  black: PropTypes.bool,
  /**
   * Makes text blue
   */
  blue: PropTypes.bool,
  /**
   * Makes text grey
   */
  grey: PropTypes.bool,
  /**
   * Makes text red
   */
  red: PropTypes.bool,
  /**
   * Makes text orange
   */
  orange: PropTypes.bool,
  /**
   * Makes text fontPrimary color
   */
  primary: PropTypes.bool,
  /**
   * Makes text muted color
   */
  muted: PropTypes.bool,
  /**
   * Makes text italic and tight
   * used in disclaimers
   */
  disclaimer: PropTypes.bool,
  /**
   * Makes text black and bigger
   * Used in modals
   */
  modal: PropTypes.bool,
  /**
   * Makes text with bigger line height
   * Used in modals with information text
   */
  infoModal: PropTypes.bool,
  /**
   * Makes text small
   */
  small: PropTypes.bool,
  /**
   * Makes text big
   */
  big: PropTypes.bool,
  /**
   * Makes text even bigger
   */
  bigger: PropTypes.bool,
  /**
   * Makes text uppercase
   */
  upper: PropTypes.bool,
  /**
   * Applies a link style
   */
  link: PropTypes.bool,
  /**
   * Applies a strikethrough decoration
   */
  strikethrough: PropTypes.bool,
  /**
   * Applies a underline decoration
   */
  underline: PropTypes.bool,
  /**
   * Removes the vertical margin
   */
  noMargin: PropTypes.bool,
  /**
   * Any other external style defined in props will be applied
   */
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default Text;
