import React, { useCallback, useRef } from 'react';
import { Hex } from '@metamask/utils';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { strings } from '../../../../../../../locales/i18n';
import { Asset } from '../../send/asset';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { AllowedPaymentTokens, AssetType } from '../../../types/token';
import { useTransactionPayRequiredTokens } from '../../../hooks/pay/useTransactionPayData';
import { getAvailableTokens } from '../../../utils/transaction-pay';
import { RouteProp, useRoute } from '@react-navigation/native';

interface PayWithModalRouteParams {
  allowedPaymentTokens?: AllowedPaymentTokens;
}

export function PayWithModal() {
  const { payToken, setPayToken } = useTransactionPayToken();
  const requiredTokens = useTransactionPayRequiredTokens();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const route =
    useRoute<RouteProp<Record<string, PayWithModalRouteParams>, string>>();
  const allowedPaymentTokens = route.params?.allowedPaymentTokens;

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleTokenSelect = useCallback(
    (token: AssetType) => {
      setPayToken({
        address: token.address as Hex,
        chainId: token.chainId as Hex,
      });

      handleClose();
    },
    [handleClose, setPayToken],
  );

  const tokenFilter = useCallback(
    (tokens: AssetType[]) =>
      getAvailableTokens({
        payToken,
        requiredTokens,
        tokens,
        allowedPaymentTokens,
      }),
    [payToken, requiredTokens, allowedPaymentTokens],
  );

  return (
    <BottomSheet
      isFullscreen
      ref={bottomSheetRef}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={handleClose}>
        {strings('pay_with_modal.title')}
      </BottomSheetHeader>
      <Asset
        includeNoBalance
        hideNfts
        tokenFilter={tokenFilter}
        onTokenSelect={handleTokenSelect}
      />
    </BottomSheet>
  );
}
