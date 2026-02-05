import React, { useCallback, useRef } from 'react';
import { Hex } from '@metamask/utils';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useWithdrawalToken } from '../../../hooks/pay/useWithdrawalToken';
import { strings } from '../../../../../../../locales/i18n';
import { Asset } from '../../send/asset';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCenter from '../../../../../../component-library/components-temp/HeaderCenter';
import { AssetType } from '../../../types/token';
import { useTransactionPayRequiredTokens } from '../../../hooks/pay/useTransactionPayData';
import { getAvailableTokens } from '../../../utils/transaction-pay';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { TransactionType } from '@metamask/transaction-controller';
import {
  hasTransactionType,
  isTransactionPayWithdraw,
} from '../../../utils/transaction';
import { useMusdConversionTokens } from '../../../../../UI/Earn/hooks/useMusdConversionTokens';
import { HIDE_NETWORK_FILTER_TYPES } from '../../../constants/confirmations';
import { useMusdPaymentToken } from '../../../../../UI/Earn/hooks/useMusdPaymentToken';

export function PayWithModal() {
  const transactionMeta = useTransactionMetadataRequest();
  const hideNetworkFilter = hasTransactionType(
    transactionMeta,
    HIDE_NETWORK_FILTER_TYPES,
  );
  const { payToken, setPayToken } = useTransactionPayToken();
  const { isWithdrawal } = useWithdrawalToken();
  const requiredTokens = useTransactionPayRequiredTokens();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { filterAllowedTokens: musdTokenFilter } = useMusdConversionTokens();
  const { onPaymentTokenChange: onMusdPaymentTokenChange } =
    useMusdPaymentToken();

  const close = useCallback((onClosed?: () => void) => {
    // Called after the bottom sheet's closing animation completes.
    bottomSheetRef.current?.onCloseBottomSheet(onClosed);
  }, []);

  const handleTokenSelect = useCallback(
    (token: AssetType) => {
      if (
        hasTransactionType(transactionMeta, [TransactionType.musdConversion])
      ) {
        close(() => onMusdPaymentTokenChange(token));
        return;
      }

      // For both deposits and withdrawals, update token via TransactionPayController
      close(() => {
        setPayToken({
          address: token.address as Hex,
          chainId: token.chainId as Hex,
        });
      });
    },
    [close, onMusdPaymentTokenChange, setPayToken, transactionMeta],
  );

  const tokenFilter = useCallback(
    (tokens: AssetType[]) => {
      // For withdrawal transactions, show all available tokens (any chain, popular tokens)
      // The bridging service will handle the actual token conversion
      if (isTransactionPayWithdraw(transactionMeta)) {
        return tokens;
      }

      // Standard deposit/payment token filtering
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

  // Dynamic title based on transaction type
  const modalTitle = isWithdrawal
    ? strings('pay_with_modal.title_receive')
    : strings('pay_with_modal.title');

  return (
    <BottomSheet
      isFullscreen
      ref={bottomSheetRef}
      keyboardAvoidingViewEnabled={false}
    >
      <HeaderCenter
        title={modalTitle}
        // HeaderCenter close handler receives a press event; we must ignore it so it
        // isn't forwarded to `onCloseBottomSheet` as the post-close callback.
        onClose={() => close()}
      />
      <Asset
        includeNoBalance
        hideNfts
        tokenFilter={tokenFilter}
        onTokenSelect={handleTokenSelect}
        hideNetworkFilter={hideNetworkFilter}
      />
    </BottomSheet>
  );
}
