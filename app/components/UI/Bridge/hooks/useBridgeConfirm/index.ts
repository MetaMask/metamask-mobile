import { useDispatch, useSelector } from 'react-redux';
import type { useBridgeQuoteData } from '../useBridgeQuoteData';
import { useNavigation } from '@react-navigation/native';
import { setIsSubmittingTx } from '../../../../../core/redux/slices/bridge';
import Routes from '../../../../../constants/navigation/Routes';
import useSubmitBridgeTx from '../../../../../util/bridge/hooks/useSubmitBridgeTx';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import type {
  InputCurrencyMode,
  MetaMetricsSwapsEventSource,
} from '@metamask/bridge-controller';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import { useBridgeInputCurrencyMode } from '../useBridgeInputCurrencyMode';

interface Params {
  activeQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'] | null;
  location: MetaMetricsSwapsEventSource;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
  inputCurrencyMode?: InputCurrencyMode;
}

export const useBridgeConfirm = ({
  activeQuote,
  location,
  transactionActiveAbTests,
  inputCurrencyMode,
}: Params) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { submitBridgeTx } = useSubmitBridgeTx();
  const walletAddress = useSelector(selectSourceWalletAddress);
  const contextInputCurrencyMode = useBridgeInputCurrencyMode();
  const resolvedInputCurrencyMode =
    inputCurrencyMode ?? contextInputCurrencyMode;

  const handleConfirm = async () => {
    try {
      if (activeQuote && walletAddress) {
        dispatch(setIsSubmittingTx(true));

        await submitBridgeTx({
          quoteResponse: activeQuote,
          location,
          transactionActiveAbTests,
          inputCurrencyMode: resolvedInputCurrencyMode,
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
