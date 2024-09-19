import { AvatarSize } from '../../components/Avatars/Avatar';
import { ButtonIconSizes } from '../../components/Buttons/ButtonIcon';
import { TextColor, TextVariant } from '../../components/Texts/Text';
import { ReactNode } from 'react';
import { ImageSourcePropType } from 'react-native';

/**
 * The optional tooltip tha can be displayed within a KeyValueRowField or KeyValueRowLabel.
 *
 * @see KeyValueRowField
 * @see KeyValueRowLabel
 */
interface KeyValueRowTooltip {
  /**
   * The title displayed at the top of the tooltip.
   */
  title: string;
  /**
   * The text displayed within the tooltip body.
   */
  text: string;
  /**
   * Optional size of the tooltip icon displayed.
   * @default TooltipSizes.Md
   */
  size?: ButtonIconSizes;
}

/**
 * An optional icon that can be displayed in a KeyValueRowField.
 *
 * @see KeyValueRowField
 */
interface KeyValueRowIcon {
  /**
   * The image source.
   */
  src: ImageSourcePropType;
  /**
   * The name of the image.
   */
  name: string;
  /**
   * Optional prop to bypass IPFS Gateway Check.
   * @default false
   */
  isIpfsGatewayCheckBypassed?: boolean;
  /**
   * Optional size of the icon.
   * @default IconSizes.Sm
   */
  size?: AvatarSize;
}

/**
 * Represents a field displayed within KeyValueRowText.
 *
 * @see KeyValueRowText
 */
interface KeyValueRowField {
  /**
   * The text to display.
   */
  text: string;
  /**
   * Optional text variant.
   * @default TextVariant.BodyMDMedium
   */
  variant?: TextVariant;
  /**
   * Optional text color.
   * @default TextColor.Default
   */
  color?: TextColor;
  /**
   * Optional icon to display. If undefined, no icon is displayed.
   */
  icon?: KeyValueRowIcon;
  /**
   * Optional tooltip to display. If undefined, no tooltip is displayed.
   */
  tooltip?: KeyValueRowTooltip;
}

export const IconSizes = AvatarSize;

export const TooltipSizes = ButtonIconSizes;

/**
 * The KeyValueRowLabel prop interface.
 *
 * @see KeyValueRowLabel in ./KeyValueRow.tsx
 */
export interface KeyValueRowLabelProps {
  /**
   * Text to display.
   */
  label: string;
  /**
   * Optional text variant.
   * @default TextVariant.BodyMDMedium
   */
  variant?: TextVariant;
  /**
   * Optional text color.
   * @default TextColor.Default
   */
  color?: TextColor;
  /**
   * Optional tooltip. If undefined, the tooltip won't be displayed.
   */
  tooltip?: KeyValueRowTooltip;
}

/**
 * Represents the main container for the KeyValueRow component.
 */
export interface KeyValueRowRootProps {
  /**
   * Must have exactly two children. Adding more will lead to an undesired outcome.
   */
  children: [ReactNode, ReactNode];
}

/**
 * Represents the valid KeyValueSection directions.
 */
export enum SectionDirections {
  /**
   * Horizontal.
   */
  ROW = 'row',
  /**
   * Vertical.
   */
  COLUMN = 'column',
}

/**
 * Represents the valid KeyValueSection alignments.
 */
export enum SectionAlignments {
  LEFT = 'flex-start',
  RIGHT = 'flex-end',
  CENTER = 'center',
}

/**
 * The KeyValueSection component props.
 */
export interface KeyValueSectionProps {
  /**
   * Child components.
   */
  children: ReactNode;
  /**
   * Optional content direction.
   * @default SectionDirections.COLUMN
   */
  direction?: SectionDirections;
  /**
   * Optional content alignment.
   * @default SectionAlignments.RIGHT
   */
  align?: SectionAlignments;
}

/**
 * Represents either the "key" (field) or the "value" in the KeyValueRow.
 */
interface KeyValueRowText {
  /**
   * Displayed on the top.
   */
  primary: KeyValueRowField;
  /**
   * Optional field displayed underneath the primary field.
   */
  secondary?: KeyValueRowField;
}

/**
 * The KeyValueRow component props.
 */
export interface KeyValueRowProps {
  /**
   * The "key" portion of the KeyValueRow (left side).
   */
  field: KeyValueRowText;
  /**
   * The "value" portion of the KeyValueRow (right side).
   */
  value: KeyValueRowText;
}
