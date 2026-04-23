import React, { useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import PropTypes from 'prop-types';

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
import { getHardwareWalletTypeForAddress } from '../../../core/HardwareWallet/helpers';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';

///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import InstallSnapApproval from '../../Approvals/InstallSnapApproval';
import SnapDialogApproval from '../../Snaps/SnapDialogApproval/SnapDialogApproval';
///: END:ONLY_INCLUDE_IF
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import SnapAccountCustomNameApproval from '../../Approvals/SnapAccountCustomNameApproval';
///: END:ONLY_INCLUDE_IF

const RootRPCMethodsUI = (props) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const {
    ensureDeviceReady,
    setTargetWalletType,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  } = useHardwareWallet();

  const trackCancelledTransaction = useCallback(
    (error) => {
      const message = error?.message ?? '';

      if (
        !message.startsWith(KEYSTONE_TX_CANCELED) &&
        !message.startsWith(STX_NO_HASH_ERROR)
      ) {
        return false;
      }

      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.DAPP_TRANSACTION_CANCELLED,
        ).build(),
      );
      return true;
    },
    [trackEvent, createEventBuilder],
  );

  const handleAutoSignError = useCallback(
    (error) => {
      if (trackCancelledTransaction(error)) {
        return true;
      }

      Logger.error(error, 'error while trying to send transaction (Main)');
      return false;
    },
    [trackCancelledTransaction],
  );

  const autoSign = useCallback(
    async (transactionMeta) => {
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

      if (walletType === HardwareWalletType.Qr) {
        try {
          props.navigation.navigate(
            ...createQRSigningTransactionModalNavDetails({
              transactionId: transactionMeta.id,
              // eslint-disable-next-line no-empty-function
              onConfirmationComplete: () => {},
            }),
          );
          return;
        } catch (error) {
          if (!trackCancelledTransaction(error)) {
            Alert.alert(
              strings('transactions.transaction_error'),
              error && error.message,
              [{ text: strings('navigation.ok') }],
            );
            Logger.error(
              error,
              'error while trying to send transaction (Main)',
            );
          }
          return;
        }
      }

      await executeHardwareWalletOperation({
        address: transactionMeta.txParams.from,
        operationType: 'transaction',
        ensureDeviceReady,
        setTargetWalletType,
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
          Engine.rejectPendingApproval(
            transactionMeta.id,
            new Error('User rejected the transaction'),
            { ignoreMissing: true, logErrors: false },
          );
        },
      });
    },
    [
      props.navigation,
      ensureDeviceReady,
      setTargetWalletType,
      showAwaitingConfirmation,
      hideAwaitingConfirmation,
      showHardwareWalletError,
      trackCancelledTransaction,
      handleAutoSignError,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
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
