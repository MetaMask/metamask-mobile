import { type Position, type Order } from '@metamask/perps-controller';

export interface PerpsCardProps {
  position?: Position;
  order?: Order;
  onPress?: () => void;
  testID?: string;
  source?: string;
  iconSize?: number;
}
