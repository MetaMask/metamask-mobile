import { useDispatch, useSelector } from 'react-redux';
import type { useBridgeQuoteData } from '../useBridgeQuoteData';
import { useNavigation } from '@react-navigation/native';
import {
  selectDestToken,
  selectSourceAmount,
  selectSourceToken,
  incrementBridgeBalanceRefreshKey,
  resetBridgeTokenInputs,
  setIsSubmittingTx,
} from '../../../../../core/redux/slices/bridge';
import Routes from '../../../../../constants/navigation/Routes';
import useSubmitBridgeTx from '../../../../../util/bridge/hooks/useSubmitBridgeTx';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import {
  type PostTradeBottomSheetParams,
  PostTradeStatus,
} from '../../components/PostTradeBottomSheet/PostTradeBottomSheet.types';
import { useABTest } from '../../../../../hooks';
import {
  POST_TRADE_MODAL_AB_KEY,
  POST_TRADE_MODAL_VARIANTS,
} from '../../components/PostTradeBottomSheet/abTestConfig';
import Engine from '../../../../../core/Engine';
import { withPostTradeNotificationSuppression } from '../../utils/postTradeNotifications';

interface Params {
  activeQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] | null;
  location: MetaMetricsSwapsEventSource;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

export const useBridgeConfirm = ({
  activeQuote,
  location,
  transactionActiveAbTests,
}: Params) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { submitBridgeTx } = useSubmitBridgeTx();
  const walletAddress = useSelector(selectSourceWalletAddress);
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const { variant: postTradeModalVariant } = useABTest(
    POST_TRADE_MODAL_AB_KEY,
    POST_TRADE_MODAL_VARIANTS,
  );
  const isPostTradeModalEnabled = postTradeModalVariant.showPostTradeModal;

  const handleConfirm = async () => {
    if (!activeQuote || !walletAddress) {
      return;
    }

    const modalTokenParams = {
      sourceAmount: sourceAmount ?? activeQuote.sentAmount?.amount,
      destAmount: activeQuote.toTokenAmount?.amount,
      sourceToken,
      destToken,
    };
    let modalParams: PostTradeBottomSheetParams = {
      ...modalTokenParams,
      status: PostTradeStatus.InProgress,
    };

    try {
      dispatch(setIsSubmittingTx(true));

      const submitTransaction = () =>
        submitBridgeTx({
          quoteResponse: activeQuote,
          location,
          transactionActiveAbTests,
        });
      const submittedTransaction = isPostTradeModalEnabled
        ? await withPostTradeNotificationSuppression(submitTransaction)
        : await submitTransaction();
      const transactionHash =
        submittedTransaction &&
        'hash' in submittedTransaction &&
        typeof submittedTransaction.hash === 'string'
          ? submittedTransaction.hash
          : undefined;

      modalParams = {
        ...modalTokenParams,
        status: PostTradeStatus.InProgress,
        transactionMetaId: submittedTransaction?.id,
        transactionHash,
      };

      if (isPostTradeModalEnabled) {
        dispatch(resetBridgeTokenInputs());
        Engine.context.BridgeController?.resetState?.();
        dispatch(incrementBridgeBalanceRefreshKey());
      }
    } catch (error) {
      console.error('Error submitting bridge tx', error);
      modalParams = {
        ...modalTokenParams,
        status: PostTradeStatus.Failed,
      };
    } finally {
      dispatch(setIsSubmittingTx(false));
      if (isPostTradeModalEnabled) {
        navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
          screen: Routes.BRIDGE.MODALS.POST_TRADE_MODAL,
          params: modalParams,
        });
      } else {
        navigation.navigate(Routes.TRANSACTIONS_VIEW);
      }
    }
  };

  return handleConfirm;
};
