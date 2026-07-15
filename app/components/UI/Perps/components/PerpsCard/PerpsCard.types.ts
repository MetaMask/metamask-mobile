import { type Position, type Order } from '@metamask/perps-controller';

export interface PerpsCardProps {
  position?: Position;
  order?: Order;
  onPress?: () => void;
  testID?: string;
  source?: string;
  /** Sub-section of the parent screen that triggered navigation (e.g., 'positions'). */
  source_section?: string;
  iconSize?: number;
}
