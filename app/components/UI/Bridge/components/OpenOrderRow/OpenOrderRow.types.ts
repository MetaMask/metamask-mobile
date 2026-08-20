import type { ReactNode } from 'react';
import type {
  FontWeight,
  TextColor,
} from '@metamask/design-system-react-native';
import type { BridgeToken } from '../../types';

export interface OpenOrderRowProps {
  /**
   * Destination token. Avatar and network badge are resolved from
   * `symbol`, `image`, `address`, and `chainId`.
   */
  token: BridgeToken;
  /**
   * Pair label shown as the row title, e.g. "ETH → USDC".
   */
  title: string;
  /**
   * Secondary left copy, e.g. expiry or schedule summary.
   */
  subtitle: string;
  /**
   * Right-column primary value, e.g. "$208.99" or "+0.325 USDC".
   */
  primaryValue: string;
  /**
   * Right-column secondary copy, e.g. "USDC limit price".
   */
  secondaryValue: string;
  /**
   * Color for `title`. Defaults to `TextDefault`.
   */
  titleColor?: TextColor;
  /**
   * Optional node after the title (warning icon or status Tag).
   */
  titleEndAccessory?: ReactNode;
  /**
   * Color for `primaryValue`. Defaults to `TextDefault`.
   */
  primaryColor?: TextColor;
  /**
   * Color for `subtitle`. Defaults to `TextAlternative`.
   */
  subtitleColor?: TextColor;
  /**
   * Font weight for `subtitle`. Defaults to Regular.
   */
  subtitleFontWeight?: FontWeight;
  /**
   * Press handler. When omitted the row is not interactive.
   */
  onPress?: () => void;
  /**
   * Optional test ID for the root element.
   */
  testID?: string;
}
