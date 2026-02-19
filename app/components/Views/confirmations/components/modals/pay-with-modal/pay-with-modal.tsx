import React, { useCallback, useRef } from 'react';
import { Hex } from '@metamask/utils';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import { strings } from '../../../../../../../locales/i18n';
import { Asset } from '../../send/asset';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCompactStandard from '../../../../../../component-library/components-temp/HeaderCompactStandard';
import {
  AssetType,
  isHighlightedActionListItem,
  isHighlightedAssetListItem,
  TokenListItem,
} from '../../../types/token';
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
import { usePerpsBalanceTokenFilter } from '../../../../../UI/Perps/hooks/usePerpsBalanceTokenFilter';
import { usePerpsPaymentToken } from '../../../../../UI/Perps/hooks/usePerpsPaymentToken';

export function PayWithModal() {
  const transactionMeta = useTransactionMetadataRequest();
  const hideNetworkFilter = hasTransactionType(
    transactionMeta,
    HIDE_NETWORK_FILTER_TYPES,
  );
  const { payToken, setPayToken } = useTransactionPayToken();
  const { isWithdraw } = useTransactionPayWithdraw();
  const requiredTokens = useTransactionPayRequiredTokens();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { filterAllowedTokens: musdTokenFilter } = useMusdConversionTokens();
  const { onPaymentTokenChange: onMusdPaymentTokenChange } =
    useMusdPaymentToken();
  const { onPaymentTokenChange: onPerpsPaymentTokenChange } =
    usePerpsPaymentToken();
  const perpsBalanceTokenFilter = usePerpsBalanceTokenFilter();

  const close = useCallback((onClosed?: () => void) => {
    // Called after the bottom sheet's closing animation completes.
    bottomSheetRef.current?.onCloseBottomSheet(onClosed);
  }, []);

  const wrapHighlightedItemCallbacks = useCallback(
    (items: TokenListItem[]): TokenListItem[] =>
      items.map((item) => {
        if (isHighlightedAssetListItem(item)) {
          return {
            ...item,
            action: () => close(item.action),
          };
        }

        if (isHighlightedActionListItem(item)) {
          return {
            ...item,
            actions: item.actions.map((actionItem) => ({
              ...actionItem,
              onPress: () => close(actionItem.onPress),
            })),
          };
        }

        return item;
      }),
    [close],
  );

  const handleTokenSelect = useCallback(
    (token: AssetType) => {
      const onClosed = () => {
        if (
          hasTransactionType(transactionMeta, [TransactionType.musdConversion])
        ) {
          onMusdPaymentTokenChange(token);
          return;
        }

        if (
          hasTransactionType(transactionMeta, [
            TransactionType.perpsDepositAndOrder,
          ])
        ) {
          onPerpsPaymentTokenChange(token);
          return;
        }

        setPayToken({
          address: token.address as Hex,
          chainId: token.chainId as Hex,
        });
      };

      close(onClosed);
    },
    [
      close,
      onMusdPaymentTokenChange,
      onPerpsPaymentTokenChange,
      setPayToken,
      transactionMeta,
    ],
  );

  const tokenFilter = useCallback(
    (tokens: AssetType[]): TokenListItem[] => {
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

      let filteredTokens: TokenListItem[] = availableTokens;

      if (
        hasTransactionType(transactionMeta, [TransactionType.musdConversion])
      ) {
        filteredTokens = musdTokenFilter(availableTokens);
      } else if (
        hasTransactionType(transactionMeta, [
          TransactionType.perpsDepositAndOrder,
        ])
      ) {
        filteredTokens = perpsBalanceTokenFilter(availableTokens);
      }

      return wrapHighlightedItemCallbacks(filteredTokens);
    },
    [
      musdTokenFilter,
      payToken,
      requiredTokens,
      transactionMeta,
      perpsBalanceTokenFilter,
      wrapHighlightedItemCallbacks,
    ],
  );

  // Dynamic title based on transaction type
  const modalTitle = isWithdraw
    ? strings('pay_with_modal.title_receive')
    : strings('pay_with_modal.title');

  return (
    <BottomSheet
      isFullscreen
      ref={bottomSheetRef}
      keyboardAvoidingViewEnabled={false}
    >
      <HeaderCompactStandard
        title={modalTitle}
        // HeaderCompactStandard close handler receives a press event; we must ignore it so it
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
