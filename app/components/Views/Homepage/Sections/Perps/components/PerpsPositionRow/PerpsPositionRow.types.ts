import type { Position } from '@metamask/perps-controller';

export interface PerpsPositionRowProps {
  /** Open position data */
  position: Position;
  /** Callback when the row is pressed */
  onPress?: () => void;
  /** Test ID prefix (default: 'perps-position-row') */
  testID?: string;
}
