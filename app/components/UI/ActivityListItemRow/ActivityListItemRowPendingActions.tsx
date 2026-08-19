/* eslint-disable @typescript-eslint/no-deprecated -- intentionally reuses the legacy StyledButton to match the existing pending-row action visuals; migration to the DS Button is tracked separately */
/**
 * Speed-up / cancel (and hardware-wallet sign) actions for a pending local EVM
 * activity row. Mobile equivalent of the extension's
 * `TransactionListItemPendingActions`, with the additional QR/Ledger signing
 * flows that only exist on Mobile (ported from the legacy `TransactionElement`).
 */
import React from 'react';
import { View } from 'react-native';
import { type TransactionMeta } from '@metamask/transaction-controller';
import { strings } from '../../../../locales/i18n';
import StyledButton from '../StyledButton';
import { getPendingTxActionVisibility } from '../Transactions/pendingTxActions';
import type { ActivityListItemRowStyles } from './ActivityListItemRow.styles';

export interface ActivityListItemRowPendingActionsProps {
  tx: TransactionMeta;
  styles: ActivityListItemRowStyles;
  isQRHardwareAccount: boolean;
  isLedgerAccount: boolean;
  onSpeedUpAction: (open: boolean, tx?: TransactionMeta) => void;
  onCancelAction: (open: boolean, tx?: TransactionMeta) => void;
  signQRTransaction: (tx: TransactionMeta) => void;
  signLedgerTransaction: (tx: Pick<TransactionMeta, 'id'>) => void;
  cancelUnsignedQRTransaction: (tx: TransactionMeta) => void;
}

export function ActivityListItemRowPendingActions({
  tx,
  styles,
  isQRHardwareAccount,
  isLedgerAccount,
  onSpeedUpAction,
  onCancelAction,
  signQRTransaction,
  signLedgerTransaction,
  cancelUnsignedQRTransaction,
}: ActivityListItemRowPendingActionsProps) {
  const {
    showSpeedUpCancel: renderNormalActions,
    showQRSign: renderUnsignedQRActions,
    showLedgerSign: renderLedgerActions,
  } = getPendingTxActionVisibility(tx, {
    isQRHardwareAccount,
    isLedgerAccount,
  });

  if (
    !renderNormalActions &&
    !renderUnsignedQRActions &&
    !renderLedgerActions
  ) {
    return null;
  }

  return (
    <View style={styles.pendingActions}>
      {renderNormalActions && (
        <>
          <StyledButton
            type="normal"
            containerStyle={[
              styles.actionContainerStyle,
              styles.speedupActionContainerStyle,
            ]}
            style={styles.actionStyle}
            onPress={() => onSpeedUpAction(true, tx)}
          >
            {strings('transaction.speedup')}
          </StyledButton>
          <StyledButton
            type="cancel"
            containerStyle={styles.actionContainerStyle}
            style={styles.actionStyle}
            onPress={() => onCancelAction(true, tx)}
          >
            {strings('transaction.cancel')}
          </StyledButton>
        </>
      )}
      {renderUnsignedQRActions && (
        <>
          <StyledButton
            type="normal"
            containerStyle={[
              styles.actionContainerStyle,
              styles.speedupActionContainerStyle,
            ]}
            style={styles.actionStyle}
            onPress={() => signQRTransaction(tx)}
          >
            {strings('transaction.sign_with_keystone')}
          </StyledButton>
          <StyledButton
            type="cancel"
            containerStyle={[
              styles.actionContainerStyle,
              styles.speedupActionContainerStyle,
            ]}
            style={styles.actionStyle}
            onPress={() => cancelUnsignedQRTransaction(tx)}
          >
            {strings('transaction.cancel')}
          </StyledButton>
        </>
      )}
      {renderLedgerActions && (
        <StyledButton
          type="normal"
          containerStyle={[
            styles.actionContainerStyle,
            styles.speedupActionContainerStyle,
          ]}
          style={styles.actionStyle}
          onPress={() => signLedgerTransaction({ id: tx.id })}
        >
          {strings('transaction.sign_with_ledger')}
        </StyledButton>
      )}
    </View>
  );
}
