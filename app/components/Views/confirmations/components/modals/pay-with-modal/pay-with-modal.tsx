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
      // Call after the bottom sheet's closing animation completes.
      bottomSheetRef.current?.onCloseBottomSheet(() => {
        setPayToken({
          address: token.address as Hex,
          chainId: token.chainId as Hex,
        });
      });
    },
    [setPayToken],
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
