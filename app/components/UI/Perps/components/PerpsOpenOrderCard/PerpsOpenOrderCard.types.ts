import type { Order } from '../../controllers/types';

export interface PerpsOpenOrderCardProps {
  order: Order;
  onCancel?: (order: Order) => void;
  onSelect?: (orderId: string) => void;
  disabled?: boolean;
  expanded?: boolean;
  showIcon?: boolean;
  rightAccessory?: React.ReactNode;
  isActiveOnChart?: boolean;
  activeType?: 'TP' | 'SL' | 'BOTH';
}

export interface OpenOrderCardDerivedData {
  direction: 'long' | 'short' | 'Close Long' | 'Close Short';
  sizeInUSD: string;
  fillPercentage: number;
}
