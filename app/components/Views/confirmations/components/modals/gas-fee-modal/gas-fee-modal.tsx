import React, { useCallback, useState } from 'react';

import { EstimatesModal } from '../estimates-modal';
import { AdvancedEIP1559Modal } from '../advanced-eip1559-modal';
import { AdvancedGasPriceModal } from '../advanced-gas-price-modal';
import { GasModalType } from '../../../constants/gas';

export const GasFeeModal = ({
  setGasModalVisible,
}: {
  setGasModalVisible: (visible: boolean) => void;
}) => {
  const [activeModal, setActiveModal] = useState(GasModalType.ESTIMATES);

  const handleCloseModals = useCallback(() => {
    setGasModalVisible(false);
  }, [setGasModalVisible]);

  switch (activeModal) {
    case GasModalType.ESTIMATES:
      return (
        <EstimatesModal
          setActiveModal={setActiveModal}
          handleCloseModals={handleCloseModals}
        />
      );
    case GasModalType.ADVANCED_EIP1559:
      return (
        <AdvancedEIP1559Modal
          setActiveModal={setActiveModal}
          handleCloseModals={handleCloseModals}
        />
      );
    case GasModalType.ADVANCED_GAS_PRICE:
      return (
        <AdvancedGasPriceModal
          setActiveModal={setActiveModal}
          handleCloseModals={handleCloseModals}
        />
      );
    default:
      return null;
  }
};
