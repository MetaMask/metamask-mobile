import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useDispatch } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import {
  resetHardwareWalletsSwaps,
  updateHardwareWalletsSwaps,
} from '../../../../core/redux/slices/bridge';
import { HardwareWalletsSwapsEventType } from './HardwareWalletsSwaps.state';
import { Flow } from './flowStrategy';
import { isHardwareAccount } from '../../../../util/address';
import { hasTransactionType } from '../../../Views/confirmations/utils/transaction';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import useApprovalRequest from '../../../Views/confirmations/hooks/useApprovalRequest';
import { useSelectedGasFeeToken } from '../../../Views/confirmations/hooks/gas/useGasFeeToken';
import { useTokenAmount } from '../../../Views/confirmations/hooks/useTokenAmount';
import { useTokenAsset } from '../../../Views/confirmations/hooks/useTokenAsset';

/**
 * Handles HW-send confirmation by routing to the HW signing-progress screen.
 *
 * Split into a pure predicate (`shouldDefer`) and a side-effectful action
 * (`defer`) so callers don't have to invoke the action to find out whether
 * it would apply. v1 is fungible-only (simpleSend + tokenMethodTransfer)
 *
 * NOTE: Bridge does NOT use this hook — it uses nested navigation
 * (`BRIDGE.ROOT` → `{ screen, params }`), a structurally different shape.
 * Forcing both through one hook would require a discriminator param or
 * change bridge's navigation behavior; bridge keeps its own inline dispatch.
 */
export function useHandleHwSend() {
  const dispatch = useDispatch();
  const navigation = useNavigation<AppNavigationProp>();
  const { approvalRequest } = useApprovalRequest();
  const selectedGasFeeToken = useSelectedGasFeeToken();
  const { amount: displayAmount } = useTokenAmount();
  const { displayName: displayTokenSymbol } = useTokenAsset();

  const shouldDefer = useCallback(
    (transactionMetadata: TransactionMeta): boolean =>
      Boolean(
        isHardwareAccount(transactionMetadata.txParams?.from ?? '') &&
          hasTransactionType(transactionMetadata, [
            TransactionType.simpleSend,
            TransactionType.tokenMethodTransfer,
          ]),
      ),
    [],
  );

  const defer = useCallback(
    (transactionMetadata: TransactionMeta) => {
      const gasTokenAddress = selectedGasFeeToken?.tokenAddress;
      const batchTransactionCount =
        transactionMetadata.batchTransactions?.length ?? 0;
      // Bundles require BOTH gasTokenAddress AND populated batchTransactions;
      // one progress step is rendered for each bundled child plus the root tx.
      const totalSteps =
        gasTokenAddress && batchTransactionCount > 0
          ? batchTransactionCount + 1
          : 1;
      const sendbundleGasTokenAddress =
        totalSteps > 1 ? gasTokenAddress : undefined;

      dispatch(resetHardwareWalletsSwaps());
      dispatch(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.Start,
          payload: {
            flow: Flow.Send,
            totalSteps,
            recipientAddress: transactionMetadata.txParams.to,
            gasTokenAddress: sendbundleGasTokenAddress,
          },
        }),
      );
      navigation.navigate(Routes.BRIDGE.HARDWARE_WALLETS_SWAPS, {
        flow: Flow.Send,
        preparedTxMeta: transactionMetadata,
        gasTokenAddress: sendbundleGasTokenAddress,
        // WALLET SAFETY: lets the screen assert it accepts the same pending approval deferred here.
        approvalRequestId: approvalRequest?.id,
        displayContext: {
          amount: displayAmount,
          tokenSymbol: displayTokenSymbol,
          gasTokenSymbol: selectedGasFeeToken?.symbol,
          recipient: transactionMetadata.txParams.to,
        },
      });
    },
    [
      dispatch,
      navigation,
      approvalRequest,
      selectedGasFeeToken,
      displayAmount,
      displayTokenSymbol,
    ],
  );

  return { shouldDefer, defer };
}
