export interface TextProps {
  /**
   * Resets default style
   */
  reset?: boolean;
  /**
   * Align text to center
   */
  centered?: boolean;
  /**
   * Align text to right
   */
  right?: boolean;
  /**
   * Makes text bold
   */
  bold?: boolean;
  /**
   * Makes text green
   */
  green?: boolean;
  /**
   * Makes text black
   */
  black?: boolean;
  /**
   * Makes text blue
   */
  blue?: boolean;
  /**
   * Makes text grey
   */
  grey?: boolean;
  /**
   * Makes text red
   */
  red?: boolean;
  /**
   * Makes text orange
   */
  orange?: boolean;
  /**
   * Makes text fontPrimary color
   */
  primary?: boolean;
  /**
   * Makes text muted color
   */
  muted?: boolean;
  /**
   * Makes text italic and tight
   * used in disclaimers
   */
  disclaimer?: boolean;
  /**
   * Makes text black and bigger
   * Used in modals
   */
  modal?: boolean;
  /**
   * Makes text with bigger line height
   * Used in modals with information text
   */
  infoModal?: boolean;
  /**
   * Makes text small
   */
  small?: boolean;
  /**
   * Makes text big
   */
  big?: boolean;
  /**
   * Makes text even bigger
   */
  bigger?: boolean;
  /**
   * Makes text uppercase
   */
  upper?: boolean;
  /**
   * Applies a link style
   */
  link?: boolean;
  /**
   * Applies a strikethrough decoration
   */
  strikethrough?: boolean;
  /**
   * Applies a underline decoration
   */
  underline?: boolean;
  /**
   * Removes the vertical margin
   */
  noMargin?: boolean;
  /**
   * Any other external style defined in props will be applied
   */
  style?: any;
}
