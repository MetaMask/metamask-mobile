import React, { useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';

import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import { onUnapprovedTransaction } from './onUnapprovedTransaction';
import Logger from '../../../util/Logger';
import { KEYSTONE_TX_CANCELED } from '../../../constants/error';
import { MetaMetricsEvents } from '../../../core/Analytics';
import WatchAssetApproval from '../../Approvals/WatchAssetApproval';
import AddChainApproval from '../../Approvals/AddChainApproval';
import SwitchChainApproval from '../../Approvals/SwitchChainApproval';
import ConnectApproval from '../../Approvals/ConnectApproval';
import PermissionApproval from '../../Approvals/PermissionApproval';
import FlowLoaderModal from '../../Approvals/FlowLoaderModal';
import TemplateConfirmationModal from '../../Approvals/TemplateConfirmationModal';
import { createQRSigningTransactionModalNavDetails } from '../../UI/QRHardware/QRSigningTransactionModal';
import { ConfirmRoot } from '../../../components/Views/confirmations/components/confirm';
import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
import { STX_NO_HASH_ERROR } from '../../../util/smart-transactions/smart-publish-hook';
import {
  useHardwareWallet,
  executeHardwareWalletOperation,
} from '../../../core/HardwareWallet';
import {
  getDeviceIdForAddress,
  getHardwareWalletTypeForAddress,
} from '../../../core/HardwareWallet/helpers';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import {
  selectHardwareWalletsSwaps,
  updateHardwareWalletsSwaps,
} from '../../../core/redux/slices/bridge';
import {
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsStepKind,
} from '../../UI/Bridge/Views/HardwareWalletsSwaps/HardwareWalletsSwaps.state';

///: BEGIN:ONLY_INCLUDE_IF(snaps)
import InstallSnapApproval from '../../Approvals/InstallSnapApproval';
import SnapDialogApproval from '../../Snaps/SnapDialogApproval/SnapDialogApproval';
///: END:ONLY_INCLUDE_IF
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import SnapAccountCustomNameApproval from '../../Approvals/SnapAccountCustomNameApproval';
///: END:ONLY_INCLUDE_IF

const RootRPCMethodsUI = (props) => {
  const dispatch = useDispatch();
  const hardwareWalletsSwaps = useSelector(selectHardwareWalletsSwaps);
  const hardwareWalletsSwapsStatusRef = useRef(hardwareWalletsSwaps.status);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const {
    ensureDeviceReady,
    setPendingOperationAddress,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  } = useHardwareWallet();

  const isCancelledError = useCallback((error) => {
    const message = error?.message ?? '';
    return (
      message.startsWith(KEYSTONE_TX_CANCELED) ||
      message.startsWith(STX_NO_HASH_ERROR)
    );
  }, []);

  const trackTransactionCancelledEvent = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.DAPP_TRANSACTION_CANCELLED).build(),
    );
  }, [trackEvent, createEventBuilder]);

  const handleAutoSignError = useCallback(
    (error) => {
      if (isCancelledError(error)) {
        trackTransactionCancelledEvent();
        return true;
      }

      Logger.error(error, 'error while trying to send transaction (Main)');
      return false;
    },
    [isCancelledError, trackTransactionCancelledEvent],
  );

  const showAutoSignError = useCallback(
    (error) => {
      if (isCancelledError(error)) {
        trackTransactionCancelledEvent();
        return true;
      }

      Alert.alert(
        strings('transactions.transaction_error'),
        error && error.message,
        [{ text: strings('navigation.ok') }],
      );
      Logger.error(error, 'error while trying to send transaction (Main)');
      return false;
    },
    [isCancelledError, trackTransactionCancelledEvent],
  );

  useEffect(() => {
    hardwareWalletsSwapsStatusRef.current = hardwareWalletsSwaps.status;
  }, [hardwareWalletsSwaps.status]);

  const getProgressStepKind = useCallback((transactionType) => {
    if (
      transactionType === TransactionType.bridgeApproval ||
      transactionType === TransactionType.swapApproval
    ) {
      return HardwareWalletsSwapsStepKind.Approval;
    }

    return HardwareWalletsSwapsStepKind.Transaction;
  }, []);

  const rejectPendingTransaction = useCallback((transactionId) => {
    Engine.rejectPendingApproval(
      transactionId,
      new Error('User rejected the transaction'),
      { ignoreMissing: true, logErrors: false },
    );
  }, []);

  const autoSignWithBridgeProgress = useCallback(
    async (transactionMeta) => {
      const stepKind = getProgressStepKind(transactionMeta.type);
      const from = transactionMeta.txParams.from;

      setPendingOperationAddress(from);

      try {
        const deviceId = await getDeviceIdForAddress(from);
        const isReady = await ensureDeviceReady(deviceId);

        if (!isReady) {
          dispatch(
            updateHardwareWalletsSwaps({
              type: 'REJECTED',
              payload: { stepKind },
            }),
          );
          rejectPendingTransaction(transactionMeta.id);
          return;
        }

        dispatch(
          updateHardwareWalletsSwaps({
            type: 'SIGNING',
            payload: { stepKind },
          }),
        );
        await Engine.context.ApprovalController.acceptRequest(
          transactionMeta.id,
          undefined,
          {
            waitForResult: true,
          },
        );
        dispatch(
          updateHardwareWalletsSwaps({
            type: 'SIGNED',
            payload: { stepKind },
          }),
        );
      } catch (error) {
        dispatch(
          updateHardwareWalletsSwaps({
            type: 'REJECTED',
            payload: { stepKind },
          }),
        );
        handleAutoSignError(error);
        rejectPendingTransaction(transactionMeta.id);
      } finally {
        setPendingOperationAddress(null);
      }
    },
    [
      dispatch,
      ensureDeviceReady,
      getProgressStepKind,
      handleAutoSignError,
      rejectPendingTransaction,
      setPendingOperationAddress,
    ],
  );

  const autoSign = useCallback(
    async (transactionMeta) => {
      try {
        const walletType = getHardwareWalletTypeForAddress(
          transactionMeta.txParams.from,
        );

        if (!walletType) {
          return;
        }

        // As the `TransactionController:unapprovedTransactionAdded` event is emitted
        // before the approval request is added to `ApprovalController`, we need to wait
        // for the next tick to make sure the approval request is present when auto-approve it
        await new Promise((resolve) => setTimeout(resolve, 0));

        const isBridgeProgressActive =
          hardwareWalletsSwaps.status === HardwareWalletsSwapsStatus.Waiting;

        if (walletType === HardwareWalletType.Qr) {
          props.navigation.navigate(
            ...createQRSigningTransactionModalNavDetails({
              transactionId: transactionMeta.id,
              onConfirmationComplete: (confirmed) => {
                if (
                  hardwareWalletsSwapsStatusRef.current !==
                  HardwareWalletsSwapsStatus.Waiting
                ) {
                  return;
                }

                dispatch(
                  updateHardwareWalletsSwaps({
                    type: confirmed ? 'SIGNED' : 'REJECTED',
                    payload: {
                      stepKind: getProgressStepKind(transactionMeta.type),
                    },
                  }),
                );

                if (!confirmed) {
                  rejectPendingTransaction(transactionMeta.id);
                }
              },
            }),
          );
          return;
        }

        if (isBridgeProgressActive) {
          await autoSignWithBridgeProgress(transactionMeta);
          return;
        }

        await executeHardwareWalletOperation({
          address: transactionMeta.txParams.from,
          operationType: 'transaction',
          ensureDeviceReady,
          setPendingOperationAddress,
          showAwaitingConfirmation,
          hideAwaitingConfirmation,
          showHardwareWalletError,
          onError: handleAutoSignError,
          execute: async () => {
            await Engine.context.ApprovalController.acceptRequest(
              transactionMeta.id,
              undefined,
              {
                waitForResult: true,
              },
            );
          },
          onRejected: () => {
            rejectPendingTransaction(transactionMeta.id);
          },
        });
      } catch (error) {
        showAutoSignError(error);
      }
    },
    [
      props.navigation,
      ensureDeviceReady,
      setPendingOperationAddress,
      showAwaitingConfirmation,
      hideAwaitingConfirmation,
      showHardwareWalletError,
      handleAutoSignError,
      showAutoSignError,
      hardwareWalletsSwaps.status,
      dispatch,
      getProgressStepKind,
      rejectPendingTransaction,
      autoSignWithBridgeProgress,
      hardwareWalletsSwapsStatusRef,
    ],
  );

  const handleUnapprovedTransaction = useCallback(
    (transactionMeta) => {
      onUnapprovedTransaction(transactionMeta, {
        autoSign,
      });
    },
    [autoSign],
  );

  // unapprovedTransaction effect
  useEffect(() => {
    Engine.controllerMessenger.subscribe(
      'TransactionController:unapprovedTransactionAdded',
      handleUnapprovedTransaction,
    );
    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:unapprovedTransactionAdded',
        handleUnapprovedTransaction,
      );
    };
  }, [handleUnapprovedTransaction]);

  useEffect(
    () =>
      function cleanup() {
        Engine.context.TokensController?.hub?.removeAllListeners();
      },
    [],
  );

  return (
    <React.Fragment>
      <ConfirmRoot />
      <AddChainApproval />
      <SwitchChainApproval />
      <WatchAssetApproval />
      <ConnectApproval navigation={props.navigation} />
      <PermissionApproval navigation={props.navigation} />
      <FlowLoaderModal />
      <TemplateConfirmationModal />
      {
        ///: BEGIN:ONLY_INCLUDE_IF(snaps)
      }
      <InstallSnapApproval />
      <SnapDialogApproval />
      {
        ///: END:ONLY_INCLUDE_IF
      }
      {
        ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      }
      <SnapAccountCustomNameApproval />
      {
        ///: END:ONLY_INCLUDE_IF
      }
    </React.Fragment>
  );
};

RootRPCMethodsUI.propTypes = {
  /**
   * Object that represents the navigator
   */
  navigation: PropTypes.object,
};

export default RootRPCMethodsUI;
