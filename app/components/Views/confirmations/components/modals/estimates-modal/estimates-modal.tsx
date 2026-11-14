import React, { useCallback, useRef } from 'react';
import { Modal } from 'react-native';
import {
  BottomSheet,
  BottomSheetRef,
  Box,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../../locales/i18n';
import { GasOption } from '../../../components/gas/gas-option';
import { useGasOptions } from '../../../hooks/gas/useGasOptions';
import { GasModalType } from '../../../constants/gas';
import BottomSheetHeaderGlass from '../../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../../../../../selectors/featureFlagController/glassHeaders';

export const EstimatesModal = ({
  setActiveModal,
  handleCloseModals,
}: {
  setActiveModal: (modal: GasModalType) => void;
  handleCloseModals: () => void;
}) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { options } = useGasOptions({ setActiveModal, handleCloseModals });

  const handleSheetClosed = useCallback(() => {
    handleCloseModals();
  }, [handleCloseModals]);

  const handleRequestClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <Modal
      visible
      animationType="none"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={handleRequestClose}
    >
      <BottomSheet
        ref={bottomSheetRef}
        keyboardAvoidingViewEnabled={false}
        onClose={handleSheetClosed}
      >
        <BottomSheetHeaderGlass
          isGlass={isGlassHeader}
          onClose={handleRequestClose}
        >
          {strings('transactions.gas_modal.edit_network_fee')}
        </BottomSheetHeaderGlass>
        <Box twClassName="flex flex-col">
          {options.map((option) => (
            <GasOption key={option.key} option={option} />
          ))}
        </Box>
      </BottomSheet>
    </Modal>
  );
};
