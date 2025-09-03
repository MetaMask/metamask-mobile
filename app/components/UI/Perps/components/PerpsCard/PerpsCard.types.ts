import type { Position, Order } from '../../controllers/types';

export interface PerpsCardProps {
  position?: Position;
  order?: Order;
  onPress?: () => void;
  testID?: string;
}
