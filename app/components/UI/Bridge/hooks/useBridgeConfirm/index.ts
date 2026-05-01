import { useDispatch, useSelector } from 'react-redux';
import type { useBridgeQuoteData } from '../useBridgeQuoteData';
import { useNavigation } from '@react-navigation/native';
import {
  resetHardwareWalletsSwaps,
  setIsSubmittingTx,
  updateHardwareWalletsSwaps,
} from '../../../../../core/redux/slices/bridge';
import Routes from '../../../../../constants/navigation/Routes';
import useSubmitBridgeTx from '../../../../../util/bridge/hooks/useSubmitBridgeTx';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import { isHardwareAccount } from '../../../../../util/address';
import { HardwareWalletsSwapsStepKind } from '../../Views/HardwareWalletsSwaps/HardwareWalletsSwaps.state';

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
  const isHardwareWalletAccount = walletAddress
    ? Boolean(isHardwareAccount(walletAddress))
    : false;

  const handleConfirm = async () => {
    const isHardwareWalletBridgeSubmission =
      Boolean(activeQuote && walletAddress) && isHardwareWalletAccount;

    try {
      if (activeQuote && walletAddress) {
        dispatch(setIsSubmittingTx(true));

        if (isHardwareWalletBridgeSubmission) {
          dispatch(resetHardwareWalletsSwaps());
          dispatch(
            updateHardwareWalletsSwaps({
              type: 'START',
              payload: { totalSteps: activeQuote.approval ? 2 : 1 },
            }),
          );
          navigation.navigate(Routes.BRIDGE.ROOT, {
            screen: Routes.BRIDGE.HARDWARE_WALLETS_SWAPS,
          });
        }

        await submitBridgeTx({
          quoteResponse: activeQuote,
          location,
          transactionActiveAbTests,
        });
      }
    } catch (error) {
      console.error('Error submitting bridge tx', error);
      if (isHardwareWalletBridgeSubmission) {
        dispatch(
          updateHardwareWalletsSwaps({
            type: 'REJECTED',
            payload: {
              stepKind: activeQuote?.approval
                ? HardwareWalletsSwapsStepKind.Approval
                : HardwareWalletsSwapsStepKind.Transaction,
            },
          }),
        );
      }
    } finally {
      dispatch(setIsSubmittingTx(false));
      if (!isHardwareWalletBridgeSubmission) {
        navigation.navigate(Routes.TRANSACTIONS_VIEW);
      }
    }
  };

  return handleConfirm;
};
