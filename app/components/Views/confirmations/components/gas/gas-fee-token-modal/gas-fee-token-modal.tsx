import React, { useCallback, useRef } from 'react';
import { Modal, View } from 'react-native';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
} from '@metamask/design-system-react-native';
import { GasFeeToken } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import { useStyles } from '../../../../../../component-library/hooks';
import { updateSelectedGasFeeToken } from '../../../../../../util/transaction-controller';
import { strings } from '../../../../../../../locales/i18n';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { GasFeeTokenListItem } from '../gas-fee-token-list-item';
import styleSheet from './gas-fee-token-modal.styles';

export function GasFeeTokenModal({ onClose }: { onClose?: () => void }) {
  const transactionMeta = useTransactionMetadataRequest();
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const { styles } = useStyles(styleSheet, {});

  const {
    id: transactionId = '',
    gasFeeTokens,
    selectedGasFeeToken,
    excludeNativeTokenForFee,
  } = transactionMeta || {};

  const gasFeeTokenAddresses = [
    ...(excludeNativeTokenForFee ? [] : [NATIVE_TOKEN_ADDRESS as Hex]),
    ...(gasFeeTokens
      // Temporarily disable future ETH flow
      ?.filter((token) => token.tokenAddress !== NATIVE_TOKEN_ADDRESS)
      .map((token) => token.tokenAddress) ?? []),
  ];

  const handleSheetClosed = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handleRequestClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleTokenClick = useCallback(
    (token: GasFeeToken) => {
      const selectedAddress =
        token.tokenAddress === NATIVE_TOKEN_ADDRESS
          ? undefined
          : token.tokenAddress;

      updateSelectedGasFeeToken(transactionId, selectedAddress);
      bottomSheetRef.current?.onCloseBottomSheet();
    },
    [transactionId],
  );

  return (
    <Modal
      visible
      animationType="none"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={handleRequestClose}
    >
      <BottomSheet
        testID="gas-fee-token-modal"
        ref={bottomSheetRef}
        keyboardAvoidingViewEnabled={false}
        onClose={handleSheetClosed}
      >
        <BottomSheetHeader
          onClose={handleRequestClose}
          closeButtonProps={{ testID: 'close-button' }}
        >
          {strings('gas_fee_token_modal.title')}
        </BottomSheetHeader>
        <View style={styles.contentContainer}>
          {gasFeeTokenAddresses.map((tokenAddress: Hex) => (
            <GasFeeTokenListItem
              key={tokenAddress}
              tokenAddress={tokenAddress}
              isSelected={
                selectedGasFeeToken?.toLowerCase() ===
                  tokenAddress.toLowerCase() ||
                (!selectedGasFeeToken && tokenAddress === NATIVE_TOKEN_ADDRESS)
              }
              onClick={handleTokenClick}
            />
          ))}
        </View>
      </BottomSheet>
    </Modal>
  );
}
