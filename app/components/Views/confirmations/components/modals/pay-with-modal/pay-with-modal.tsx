import React, { useCallback, useRef } from 'react';
import { Hex } from '@metamask/utils';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { strings } from '../../../../../../../locales/i18n';
import { Asset } from '../../send/asset';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { AssetType } from '../../../types/token';
import { useTransactionPayRequiredTokens } from '../../../hooks/pay/useTransactionPayData';
import { getAvailableTokens } from '../../../utils/transaction-pay';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { TransactionType } from '@metamask/transaction-controller';
import { hasTransactionType } from '../../../utils/transaction';
import { useMusdConversionTokens } from '../../../../../UI/Earn/hooks/useMusdConversionTokens';

export function PayWithModal() {
  const { payToken, setPayToken } = useTransactionPayToken();
  const requiredTokens = useTransactionPayRequiredTokens();
  const transactionMeta = useTransactionMetadataRequest();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { tokenFilter: musdTokenFilter } = useMusdConversionTokens();

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
    (tokens: AssetType[]) => {
      const availableTokens = getAvailableTokens({
        payToken,
        requiredTokens,
        tokens,
      });

      if (
        hasTransactionType(transactionMeta, [TransactionType.musdConversion])
      ) {
        return musdTokenFilter(availableTokens);
      }

      return availableTokens;
    },
    [musdTokenFilter, payToken, requiredTokens, transactionMeta],
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
