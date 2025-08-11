import type { Order } from '../../controllers/types';

export interface PerpsOrderCardProps {
  order: Order;
  onCancel?: (order: Order) => void;
  disabled?: boolean;
  expanded?: boolean;
  showIcon?: boolean;
  rightAccessory?: React.ReactNode;
}

export interface OrderCardDerivedData {
  direction: 'long' | 'short';
  sizeInUSD: string;
  fillPercentage: number;
}
