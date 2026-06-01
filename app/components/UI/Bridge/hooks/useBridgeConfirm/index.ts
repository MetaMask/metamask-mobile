import { useDispatch, useSelector } from 'react-redux';
import type { useBridgeQuoteData } from '../useBridgeQuoteData';
import { useNavigation } from '@react-navigation/native';
import {
  selectDestToken,
  selectSourceAmount,
  selectSourceToken,
  resetBridgeTokenInputs,
  setIsSubmittingTx,
} from '../../../../../core/redux/slices/bridge';
import Routes from '../../../../../constants/navigation/Routes';
import useSubmitBridgeTx from '../../../../../util/bridge/hooks/useSubmitBridgeTx';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import Engine from '../../../../../core/Engine';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import { calcTokenAmount } from '../../../../../util/transactions';
import {
  type PostTradeBottomSheetParams,
  PostTradeStatus,
} from '../../components/PostTradeBottomSheet/PostTradeBottomSheet.types';

interface Params {
  activeQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] | null;
  location: MetaMetricsSwapsEventSource;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

type ActiveQuote = NonNullable<
  ReturnType<typeof useBridgeQuoteData>['activeQuote']
>;

const getDestAmount = (activeQuote: ActiveQuote) => {
  if (activeQuote.toTokenAmount?.amount) {
    return activeQuote.toTokenAmount.amount;
  }

  const atomicDestAmount = activeQuote.quote.destTokenAmount;
  const destDecimals = activeQuote.quote.destAsset.decimals;
  if (!atomicDestAmount || destDecimals === undefined) {
    return undefined;
  }

  try {
    return calcTokenAmount(atomicDestAmount, destDecimals).toFixed(5);
  } catch {
    return undefined;
  }
};

const getSubmittedTransactionHash = (
  submittedTransaction:
    | Awaited<ReturnType<ReturnType<typeof useSubmitBridgeTx>['submitBridgeTx']>>
    | undefined,
) => {
  if (
    submittedTransaction &&
    'hash' in submittedTransaction &&
    typeof submittedTransaction.hash === 'string'
  ) {
    return submittedTransaction.hash;
  }

  return undefined;
};

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

  const handleConfirm = async () => {
    if (!activeQuote || !walletAddress) {
      return;
    }

    const baseModalParams: Omit<
      PostTradeBottomSheetParams,
      | 'status'
      | 'transactionMetaId'
      | 'transactionHash'
      | 'initialTransactionStatus'
    > = {
      sourceAmount: sourceAmount ?? activeQuote.sentAmount?.amount,
      destAmount: getDestAmount(activeQuote),
      sourceToken,
      destToken,
    };
    let modalParams: PostTradeBottomSheetParams = {
      ...baseModalParams,
      status: PostTradeStatus.InProgress,
    };

    try {
      dispatch(setIsSubmittingTx(true));

      const submittedTransaction = await submitBridgeTx({
        quoteResponse: activeQuote,
        location,
        transactionActiveAbTests,
      });

      modalParams = {
        ...baseModalParams,
        status: PostTradeStatus.InProgress,
        transactionMetaId: submittedTransaction?.id,
        transactionHash: getSubmittedTransactionHash(submittedTransaction),
        initialTransactionStatus: submittedTransaction?.status,
      };

      dispatch(resetBridgeTokenInputs());
      Engine.context.BridgeController?.resetState?.();
    } catch (error) {
      console.error('Error submitting bridge tx', error);
      modalParams = {
        ...baseModalParams,
        status: PostTradeStatus.Failed,
      };
    } finally {
      dispatch(setIsSubmittingTx(false));
      navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.POST_TRADE_MODAL,
        params: modalParams,
      });
    }
  };

  return handleConfirm;
};
