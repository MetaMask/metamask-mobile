import { useDispatch, useSelector } from 'react-redux';
import { useBridgeQuoteData } from '../useBridgeQuoteData';
import { useNavigation } from '@react-navigation/native';
import { setIsSubmittingTx } from '../../../../../core/redux/slices/bridge';
import Routes from '../../../../../constants/navigation/Routes';
import useSubmitBridgeTx from '../../../../../util/bridge/hooks/useSubmitBridgeTx';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { useLatestBalance } from '../useLatestBalance';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

interface Params {
  location: MetaMetricsSwapsEventSource;
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

export const useBridgeConfirm = ({
  latestSourceBalance,
  location,
  transactionActiveAbTests,
}: Params) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { submitBridgeTx } = useSubmitBridgeTx();
  const walletAddress = useSelector(selectSourceWalletAddress);
  const { activeQuote } = useBridgeQuoteData({
    latestSourceAtomicBalance: latestSourceBalance?.atomicBalance,
  });

  const handleConfirm = async () => {
    try {
      if (activeQuote && walletAddress) {
        dispatch(setIsSubmittingTx(true));

        await submitBridgeTx({
          quoteResponse: activeQuote,
          location,
          transactionActiveAbTests,
        });
      }
    } catch (error) {
      console.error('Error submitting bridge tx', error);
    } finally {
      dispatch(setIsSubmittingTx(false));
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
    }
  };

  return handleConfirm;
};
