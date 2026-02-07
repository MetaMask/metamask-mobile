import type { Position, Order } from '@metamask/perps-controller/types';

export interface PerpsCardProps {
  position?: Position;
  order?: Order;
  onPress?: () => void;
  testID?: string;
  source?: string;
  iconSize?: number;
}
