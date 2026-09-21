import React from 'react';
import { Modal } from 'react-native';
import type { OrderItem } from '../../../../util/orders/types';
import { OrderDetailsShell } from '../OrderDetailsShell/OrderDetailsShell';

interface OrderDetailsModalProps {
  order: OrderItem | null;
  isVisible: boolean;
  onClose: () => void;
  onCancelSuccess?: (order: OrderItem) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  isVisible,
  onClose,
  onCancelSuccess,
}) => {
  if (!order) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <OrderDetailsShell
        order={order}
        onClose={onClose}
        onCancelSuccess={onCancelSuccess}
      />
    </Modal>
  );
};
