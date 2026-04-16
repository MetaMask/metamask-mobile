import React, { useCallback, useRef } from 'react';
import { Hex } from '@metamask/utils';
import { noop } from 'lodash';
import { useRoute, RouteProp } from '@react-navigation/native';
import Engine from '../../../../../../core/Engine';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import { useWithdrawTokenFilter } from '../../../hooks/pay/useWithdrawTokenFilter';
import Routes from '../../../../../../constants/navigation/Routes';
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
import {
  useTransactionPayFiatPayment,
  useTransactionPayRequiredTokens,
} from '../../../hooks/pay/useTransactionPayData';
import { useFiatPaymentHighlightedActions } from '../../../hooks/pay/useFiatPaymentHighlightedActions';
import { getAvailableTokens } from '../../../utils/transaction-pay';
import { useTransactionPayBlockedTokens } from '../../../hooks/pay/useTransactionPayBlockedTokens';
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
import { usePredictBalanceTokenFilter } from '../../../../../UI/Predict/hooks/usePredictBalanceTokenFilter';
import { usePredictPaymentToken } from '../../../../../UI/Predict/hooks/usePredictPaymentToken';

type PayWithModalRoute = RouteProp<
  { [Routes.CONFIRMATION_PAY_WITH_MODAL]: { selectedAccount?: string } },
  typeof Routes.CONFIRMATION_PAY_WITH_MODAL
>;

export function PayWithModal() {
  const route = useRoute<PayWithModalRoute>();
  const selectedAccount = route.params?.selectedAccount;

  const transactionMeta = useTransactionMetadataRequest();
  const hideNetworkFilter = hasTransactionType(
    transactionMeta,
    HIDE_NETWORK_FILTER_TYPES,
  );
  const { payToken, setPayToken } = useTransactionPayToken();
  const { isWithdraw } = useTransactionPayWithdraw();
  const requiredTokens = useTransactionPayRequiredTokens();
  const fiatPayment = useTransactionPayFiatPayment();
  const fiatHighlightedActions = useFiatPaymentHighlightedActions();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { filterAllowedTokens: musdTokenFilter } = useMusdConversionTokens();
  const { onPaymentTokenChange: onMusdPaymentTokenChange } =
    useMusdPaymentToken();
  const { onPaymentTokenChange: onPerpsPaymentTokenChange } =
    usePerpsPaymentToken();
  const perpsBalanceTokenFilter = usePerpsBalanceTokenFilter();
  const withdrawTokenFilter = useWithdrawTokenFilter(selectedAccount);
  const blockedTokens = useTransactionPayBlockedTokens();
  const { onPaymentTokenChange: onPredictPaymentTokenChange } =
    usePredictPaymentToken();
  const isPredictContext = hasTransactionType(transactionMeta, [
    TransactionType.predictDepositAndOrder,
  ]);
  const predictBalanceTokenFilter =
    usePredictBalanceTokenFilter(isPredictContext);

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
      const onClosed = async () => {
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

        if (isPredictContext) {
          onPredictPaymentTokenChange(token);
          return;
        }

        // Ensure the token is tracked by TokensController so the pay
        // controller can resolve its metadata (symbol, decimals, balance).
        // Must complete before setPayToken so the controller can find the token.
        if (isWithdraw && token.balance === '0' && !token.isNative) {
          const { TokensController, NetworkController } = Engine.context;
          try {
            const networkClientId =
              NetworkController.findNetworkClientIdByChainId(
                token.chainId as Hex,
              );
            await TokensController.addTokens(
              [
                {
                  address: token.address,
                  symbol: token.symbol,
                  decimals: token.decimals,
                  image: token.image || undefined,
                },
              ],
              networkClientId,
            );
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
      isPredictContext,
      isWithdraw,
      onMusdPaymentTokenChange,
      onPerpsPaymentTokenChange,
      onPredictPaymentTokenChange,
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
        blockedTokens,
        fiatPayment,
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
      } else if (isPredictContext) {
        filteredTokens = predictBalanceTokenFilter(availableTokens);
      }

      const wrappedTokens = wrapHighlightedItemCallbacks(filteredTokens);
      const wrappedFiatActions = wrapHighlightedItemCallbacks(
        fiatHighlightedActions,
      );

      return [...wrappedFiatActions, ...wrappedTokens];
    },
    [
      blockedTokens,
      fiatHighlightedActions,
      fiatPayment,
      withdrawTokenFilter,
      musdTokenFilter,
      payToken,
      requiredTokens,
      transactionMeta,
      isPredictContext,
      perpsBalanceTokenFilter,
      predictBalanceTokenFilter,
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
