import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import Routes from '../../../../../constants/navigation/Routes';
import { RootState } from '../../../../../reducers';
import { resetTransaction } from '../../../../../actions/transaction';
import useApprovalRequest from '../useApprovalRequest';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useFullScreenConfirmation } from '../ui/useFullScreenConfirmation';
import { selectTransactionBridgeQuotesById } from '../../../../../core/redux/slices/confirmationMetrics';
import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { cloneDeep } from 'lodash';
import { useTransactionTotalFiat } from '../pay/useTransactionTotalFiat';
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../../../util/networks';
import { useNetworkEnablement } from '../../../../hooks/useNetworkEnablement/useNetworkEnablement';

export function useTransactionConfirm() {
  const { onConfirm: onRequestConfirm } = useApprovalRequest();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { payToken } = useTransactionPayToken();
  const transactionMetadata = useTransactionMetadataRequest();
  const { chainId, id: transactionId, type } = transactionMetadata ?? {};
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const { formatted: totalFiat } = useTransactionTotalFiat();
  const { tryEnableEvmNetwork } = useNetworkEnablement();

  const shouldUseSmartTransaction = useSelector((state: RootState) =>
    selectShouldUseSmartTransaction(state, chainId),
  );

  const quotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, transactionId ?? ''),
  );

  const waitForResult = !shouldUseSmartTransaction && !quotes?.length;

  const onConfirm = useCallback(async () => {
    if (!transactionMetadata) {
      return;
    }

    const updatedMetadata = cloneDeep(transactionMetadata);
    updatedMetadata.metamaskPay = {};
    updatedMetadata.metamaskPay.chainId = payToken?.chainId;
    updatedMetadata.metamaskPay.tokenAddress = payToken?.address;
    updatedMetadata.metamaskPay.totalFiat = totalFiat;

    await onRequestConfirm(
      {
        deleteAfterResult: true,
        handleErrors: false,
        waitForResult,
      },
      { txMeta: updatedMetadata },
    );

    if (isFullScreenConfirmation && type === TransactionType.perpsDeposit) {
      navigation.navigate(Routes.WALLET_VIEW);
    } else if (isFullScreenConfirmation) {
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
    } else {
      navigation.goBack();
    }

    // Replace/remove this once we have redesigned send flow
    dispatch(resetTransaction());

    // Enable the network if it's not enabled for the Network Manager
    if (isRemoveGlobalNetworkSelectorEnabled()) {
      tryEnableEvmNetwork(chainId);
    }
  }, [
    chainId,
    dispatch,
    isFullScreenConfirmation,
    navigation,
    onRequestConfirm,
    payToken,
    totalFiat,
    transactionMetadata,
    tryEnableEvmNetwork,
    type,
    waitForResult,
  ]);

  return { onConfirm };
}
