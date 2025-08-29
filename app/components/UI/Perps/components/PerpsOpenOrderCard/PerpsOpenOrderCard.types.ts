import type { Order } from '../../controllers/types';

export interface PerpsOpenOrderCardProps {
  order: Order;
  onCancel?: (order: Order) => void;
  disabled?: boolean;
  expanded?: boolean;
  showIcon?: boolean;
  rightAccessory?: React.ReactNode;
}

export interface OpenOrderCardDerivedData {
  direction: 'long' | 'short';
  sizeInUSD: string;
  fillPercentage: number;
}
