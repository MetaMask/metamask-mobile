import React, { useCallback, useRef } from 'react';
import { Hex } from '@metamask/utils';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
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
import { hasTransactionType } from '../../../utils/transaction';
import { useMusdConversionTokens } from '../../../../../UI/Earn/hooks/useMusdConversionTokens';
import { replaceMusdConversionTransactionForPayToken } from '../../../../../UI/Earn/utils/replaceMusdConversionTransactionForPayToken';

export function PayWithModal() {
  const { payToken, setPayToken } = useTransactionPayToken();
  const requiredTokens = useTransactionPayRequiredTokens();
  const transactionMeta = useTransactionMetadataRequest();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { filterAllowedTokens: musdTokenFilter } = useMusdConversionTokens();

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleTokenSelect = useCallback(
    (token: AssetType) => {
      const isMusdConversion =
        transactionMeta &&
        hasTransactionType(transactionMeta, [TransactionType.musdConversion]);

      const selectedTokenChainId = token.chainId as Hex;
      const transactionChainId = transactionMeta?.chainId;

      const isChainMismatch =
        transactionChainId &&
        selectedTokenChainId.toLowerCase() !== transactionChainId.toLowerCase();

      // For mUSD conversions, if user selects a token on a different chain,
      // we need to recreate the transaction on the new chain instead of
      // updating the payment token on the old transaction (which would trigger
      // a cross-chain quote request).
      if (isMusdConversion && isChainMismatch && transactionMeta) {
        bottomSheetRef.current?.onCloseBottomSheet(() => {
          replaceMusdConversionTransactionForPayToken(transactionMeta, {
            address: token.address as Hex,
            chainId: selectedTokenChainId,
          }).catch((error) => {
            console.error(
              '[mUSD Conversion] Failed to replace transaction from PayWithModal',
              error,
            );
          });
        });
        return;
      }

      // Default behavior: update payment token on the current transaction.
      // Call after the bottom sheet's closing animation completes.
      bottomSheetRef.current?.onCloseBottomSheet(() => {
        setPayToken({
          address: token.address as Hex,
          chainId: token.chainId as Hex,
        });
      });
    },
    [setPayToken, transactionMeta],
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
      <HeaderCenter
        title={strings('pay_with_modal.title')}
        onClose={handleClose}
      />
      <Asset
        includeNoBalance
        hideNfts
        tokenFilter={tokenFilter}
        onTokenSelect={handleTokenSelect}
      />
    </BottomSheet>
  );
}
