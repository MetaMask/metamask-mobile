import React, { useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import PropTypes from 'prop-types';

import NotificationManager from '../../../core/NotificationManager';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import { getIsSwapApproveOrSwapTransaction } from '../../../util/transactions';
import Logger from '../../../util/Logger';
import TransactionTypes from '../../../core/TransactionTypes';
import { KEYSTONE_TX_CANCELED } from '../../../constants/error';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { isHardwareAccount } from '../../../util/address';
import WatchAssetApproval from '../../Approvals/WatchAssetApproval';
import AddChainApproval from '../../Approvals/AddChainApproval';
import SwitchChainApproval from '../../Approvals/SwitchChainApproval';
import ConnectApproval from '../../Approvals/ConnectApproval';
import PermissionApproval from '../../Approvals/PermissionApproval';
import FlowLoaderModal from '../../Approvals/FlowLoaderModal';
import TemplateConfirmationModal from '../../Approvals/TemplateConfirmationModal';
import { getDeviceId } from '../../../core/Ledger/Ledger';
import { createLedgerTransactionModalNavDetails } from '../../UI/LedgerModals/LedgerTransactionModal';
import { createQRSigningTransactionModalNavDetails } from '../../UI/QRHardware/QRSigningTransactionModal';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import { ConfirmRoot } from '../../../components/Views/confirmations/components/confirm';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { STX_NO_HASH_ERROR } from '../../../util/smart-transactions/smart-publish-hook';
import { cloneDeep } from 'lodash';

///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import InstallSnapApproval from '../../Approvals/InstallSnapApproval';
import SnapDialogApproval from '../../Snaps/SnapDialogApproval/SnapDialogApproval';
///: END:ONLY_INCLUDE_IF
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import SnapAccountCustomNameApproval from '../../Approvals/SnapAccountCustomNameApproval';
import { getIsBridgeTransaction } from '../../UI/Bridge/utils/transaction';
///: END:ONLY_INCLUDE_IF

const RootRPCMethodsUI = (props) => {
  const { trackEvent, createEventBuilder } = useMetrics();

  const autoSign = useCallback(
    async (transactionMeta) => {
      const { id: transactionId } = transactionMeta;

      try {
        Engine.controllerMessenger.subscribeOnceIf(
          'TransactionController:transactionFinished',
          (transactionMeta) => {
            try {
              if (transactionMeta.status === 'submitted') {
                NotificationManager.watchSubmittedTransaction({
                  ...transactionMeta,
                  assetType: transactionMeta.txParams.assetType,
                });
              } else {
                throw transactionMeta.error;
              }
            } catch (error) {
              console.error(error, 'error while trying to send transaction');
            }
          },
          (transactionMeta) => transactionMeta.id === transactionId,
        );

        const isLedgerAccount = isHardwareAccount(
          transactionMeta.txParams.from,
          [ExtendedKeyringTypes.ledger],
        );

        const isQRAccount = isHardwareAccount(transactionMeta.txParams.from, [
          ExtendedKeyringTypes.qr,
        ]);

        // Only auto-sign for Ledger or QR accounts
        if (!isLedgerAccount && !isQRAccount) {
          return;
        }

        // As the `TransactionController:unapprovedTransactionAdded` event is emitted
        // before the approval request is added to `ApprovalController`, we need to wait
        // for the next tick to make sure the approval request is present when auto-approve it
        await new Promise((resolve) => setTimeout(resolve, 0));

        // For Ledger Accounts we handover the signing to the confirmation flow
        if (isLedgerAccount) {
          const deviceId = await getDeviceId();

          props.navigation.navigate(
            ...createLedgerTransactionModalNavDetails({
              transactionId: transactionMeta.id,
              deviceId,
              // eslint-disable-next-line no-empty-function
              onConfirmationComplete: () => {},
              type: 'signTransaction',
            }),
          );
        } else if (isQRAccount) {
          props.navigation.navigate(
            ...createQRSigningTransactionModalNavDetails({
              transactionId: transactionMeta.id,
              // eslint-disable-next-line no-empty-function
              onConfirmationComplete: () => {},
            }),
          );
        }
      } catch (error) {
        if (
          !error?.message.startsWith(KEYSTONE_TX_CANCELED) &&
          !error?.message.startsWith(STX_NO_HASH_ERROR)
        ) {
          Alert.alert(
            strings('transactions.transaction_error'),
            error && error.message,
            [{ text: strings('navigation.ok') }],
          );
          Logger.error(error, 'error while trying to send transaction (Main)');
        } else {
          trackEvent(
            createEventBuilder(
              MetaMetricsEvents.QR_HARDWARE_TRANSACTION_CANCELED,
            ).build(),
          );
        }
      }
    },
    [props.navigation, trackEvent, createEventBuilder],
  );

  const onUnapprovedTransaction = useCallback(
    async (transactionMetaOriginal) => {
      const transactionMeta = cloneDeep(transactionMetaOriginal);

      if (transactionMeta.origin === TransactionTypes.MMM) return;

      const to = transactionMeta.txParams.to?.toLowerCase();
      const { data } = transactionMeta.txParams;

      if (
        getIsSwapApproveOrSwapTransaction(
          data,
          transactionMeta.origin,
          to,
          transactionMeta.chainId,
        ) ||
        getIsBridgeTransaction(transactionMeta)
      ) {
        autoSign(transactionMeta);
      }
    },
    [autoSign],
  );

  // unapprovedTransaction effect
  useEffect(() => {
    Engine.controllerMessenger.subscribe(
      'TransactionController:unapprovedTransactionAdded',
      onUnapprovedTransaction,
    );
    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:unapprovedTransactionAdded',
        onUnapprovedTransaction,
      );
    };
  }, [onUnapprovedTransaction]);

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
