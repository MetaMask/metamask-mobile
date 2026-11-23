import type { ReactNode } from 'react';
import {
  TextColor,
  type FontWeight,
} from '@metamask/design-system-react-native';

export interface TooltipLabelProps {
  /**
   * Label text. It carries the dotted underline and opens the tooltip when
   * pressed.
   */
  label: string;
  /**
   * Title shown at the top of the tooltip sheet.
   */
  tooltipTitle: string;
  /**
   * Body of the tooltip sheet.
   */
  tooltipContent: string | ReactNode;
  /**
   * Label text color. The underline uses the matching theme color.
   * @default TextColor.TextAlternative
   */
  color?: typeof TextColor.TextAlternative | typeof TextColor.TextDefault;
  /**
   * Label font weight.
   * @default FontWeight.Regular
   */
  fontWeight?: FontWeight;
  /**
   * Optional test ID for the pressable label.
   */
  testID?: string;
}
