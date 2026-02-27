import React, { useCallback, useMemo, useRef } from 'react';
import { Hex, toCaipAssetType } from '@metamask/utils';
import { noop } from 'lodash';
import Engine from '../../../../../../core/Engine';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import { useWithdrawTokenFilter } from '../../../hooks/pay/useWithdrawTokenFilter';
import { strings } from '../../../../../../../locales/i18n';
import { Asset } from '../../send/asset';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCompactStandard from '../../../../../../component-library/components-temp/HeaderCompactStandard';
import {
  AssetType,
  isHighlightedItemInAssetList,
  isHighlightedItemOutsideAssetList,
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
import RampsQuickBuyPaymentMethods from '../../../../../UI/Ramp/components/RampsQuickBuyPaymentMethods';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { Box } from '@metamask/design-system-react-native';

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
  const withdrawTokenFilter = useWithdrawTokenFilter();

  const close = useCallback((onClosed?: () => void) => {
    // Called after the bottom sheet's closing animation completes.
    bottomSheetRef.current?.onCloseBottomSheet(onClosed);
  }, []);

  const wrapHighlightedItemCallbacks = useCallback(
    (items: TokenListItem[]): TokenListItem[] =>
      items.map((item) => {
        if (isHighlightedItemInAssetList(item)) {
          return {
            ...item,
            action: () => close(item.action),
          };
        }

        if (isHighlightedItemOutsideAssetList(item)) {
          return {
            ...item,
            action: () => close(item.action),
            actions: item.actions?.map((actionItem) => ({
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

        // Ensure the token is tracked by TokensController so the pay
        // controller can resolve its metadata (symbol, decimals, balance).
        // This is needed for zero-balance tokens from the catalog.
        if (isWithdraw && token.balance === '0' && !token.isNative) {
          const { TokensController, NetworkController } = Engine.context;
          try {
            const networkClientId =
              NetworkController.findNetworkClientIdByChainId(
                token.chainId as Hex,
              );
            TokensController.addTokens(
              [
                {
                  address: token.address,
                  symbol: token.symbol,
                  decimals: token.decimals,
                },
              ],
              networkClientId,
            ).catch(noop);
          } catch {
            // Network not configured — skip
          }
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
      isWithdraw,
      onMusdPaymentTokenChange,
      onPerpsPaymentTokenChange,
      setPayToken,
      transactionMeta,
    ],
  );

  const tokenFilter = useCallback(
    (tokens: AssetType[]): TokenListItem[] => {
      if (isTransactionPayWithdraw(transactionMeta)) {
        return withdrawTokenFilter(tokens);
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
      withdrawTokenFilter,
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

  const primaryRequiredToken = useMemo(
    () => requiredTokens.find((token) => !token.skipIfBalance),
    [requiredTokens],
  );

  const quickBuyAssetId = useMemo(() => {
    const selectedToken = payToken ?? primaryRequiredToken;
    if (!selectedToken?.address || !selectedToken?.chainId) {
      return undefined;
    }

    const nativeAddress = getNativeTokenAddress(selectedToken.chainId as Hex);
    if (selectedToken.address.toLowerCase() === nativeAddress.toLowerCase()) {
      return undefined;
    }

    const chainReference = Number(selectedToken.chainId).toString();
    if (!chainReference || chainReference === 'NaN') {
      return undefined;
    }

    return toCaipAssetType(
      'eip155',
      chainReference,
      'erc20',
      selectedToken.address,
    );
  }, [payToken, primaryRequiredToken]);

  const quickBuyAmount = useMemo(() => {
    if (!primaryRequiredToken?.amountUsd) {
      return undefined;
    }

    const amount = Number(primaryRequiredToken.amountUsd);
    if (!Number.isFinite(amount) || amount <= 0) {
      return undefined;
    }

    return amount.toString();
  }, [primaryRequiredToken?.amountUsd]);

  const shouldShowQuickBuyPaymentMethods =
    !isWithdraw &&
    hasTransactionType(transactionMeta, [
      TransactionType.perpsDeposit,
      TransactionType.perpsDepositAndOrder,
      TransactionType.predictDeposit,
    ]) &&
    Boolean(quickBuyAssetId && quickBuyAmount);

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
      {shouldShowQuickBuyPaymentMethods && quickBuyAssetId && quickBuyAmount ? (
        <Box twClassName="px-4 pb-2">
          <RampsQuickBuyPaymentMethods
            assetId={quickBuyAssetId}
            amount={quickBuyAmount}
            testID="transaction-add-funds-quick-buy"
          />
        </Box>
      ) : null}
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
