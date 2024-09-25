import {
  IconProps,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { ButtonIconSizes } from '../../components/Buttons/ButtonIcon';
import { ReactNode } from 'react';
import { TextProps } from '../../components/Texts/Text/Text.types';
import { ViewProps } from 'react-native';

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
   * Optional size of the tooltip icon.
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
 * Represents a field displayed within KeyValueRowProps.
 *
 * @see KeyValueRowProps
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
  /**
   * Optional styles. Useful for controlling padding and margins.
   */
  style?: ViewProps['style'];
}

/**
 * Represents the valid KeyValueSection alignments.
 */
export enum KeyValueRowSectionAlignments {
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
   * Optional content alignment.
   * @default KeyValueRowSectionAlignments.RIGHT
   */
  align?: KeyValueRowSectionAlignments;
}

/**
 * The KeyValueRow component props.
 */
export interface KeyValueRowProps {
  /**
   * The "key" portion of the KeyValueRow (left side).
   * Using the variable name field because key is reserved.
   */
  field: KeyValueRowField;
  /**
   * The "value" portion of the KeyValueRow (right side).
   */
  value: KeyValueRowField;
  /**
   * Optional styles. E.g. specifying padding or margins.
   */
  style?: ViewProps['style'];
}
