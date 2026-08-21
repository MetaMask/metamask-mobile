import { TextColor } from '@metamask/design-system-react-native';

export interface BreakdownRowProps {
  /** Primary label shown on the left. */
  title: string;
  /** Supporting copy shown under the title. */
  subtitle: string;
  /** Right-aligned amount or status. */
  value: string;
  /** Test ID for the row container. */
  testID: string;
  /** Color of the right-aligned value. Defaults to `TextColor.TextDefault`. */
  valueColor?: TextColor;
}
