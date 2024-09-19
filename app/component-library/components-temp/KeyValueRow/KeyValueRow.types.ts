import {
  IconProps,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { ButtonIconSizes } from '../../components/Buttons/ButtonIcon';
import { ReactNode } from 'react';
import { TextProps } from '../../components/Texts/Text/Text.types';

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
 * Used to position icon in KeyValueRowField
 *
 * @see KeyValueRowField
 */
export enum KeyValueRowFieldIconSides {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  BOTH = 'BOTH',
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
  variant?: TextProps['variant'];
  /**
   * Optional text color.
   * @default TextColor.Default
   */
  color?: TextProps['color'];
  /**
   * Optional icon to display. If undefined, no icon is displayed.
   */
  icon?: IconProps & { side?: KeyValueRowFieldIconSides };
  /**
   * Optional tooltip to display. If undefined, no tooltip is displayed.
   */
  tooltip?: KeyValueRowTooltip;
}

export const IconSizes = IconSize;

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
  variant?: TextProps['variant'];
  /**
   * Optional text color.
   * @default TextColor.Default
   */
  color?: TextProps['color'];
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
