/* eslint-disable @typescript-eslint/no-deprecated -- intentionally reuses the legacy StyledButton to match the existing pending-row action visuals; migration to the DS Button is tracked separately */
/**
 * Speed-up / cancel (and hardware-wallet sign) actions for a pending local EVM
 * activity row. Mobile equivalent of the extension's
 * `TransactionListItemPendingActions`, with the additional QR/Ledger signing
 * flows that only exist on Mobile (ported from the legacy `TransactionElement`).
 */
import React from 'react';
import { type TransactionMeta } from '@metamask/transaction-controller';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../locales/i18n';
import StyledButton from '../StyledButton';
import {
  showSpeedUp,
  getPendingTxActionVisibility,
} from '../Transactions/pendingTxActions';
import { View } from '../primitives/View';

export interface ActivityListItemRowPendingActionsProps {
  tx: TransactionMeta;
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
  isQRHardwareAccount,
  isLedgerAccount,
  onSpeedUpAction,
  onCancelAction,
  signQRTransaction,
  signLedgerTransaction,
  cancelUnsignedQRTransaction,
}: ActivityListItemRowPendingActionsProps) {
  const tw = useTailwind();
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

  const actionContainerStyle = tw.style('h-[25px] p-0');
  const speedupActionContainerStyle = tw.style('h-[25px] p-0 mr-2.5');
  const actionStyle = tw.style('p-0 px-2.5', { fontSize: 10 });

  return (
    <View className="flex-row items-center justify-end pb-2 pt-1">
      {renderNormalActions && (
        <>
          {showSpeedUp(tx.type) && (
            <StyledButton
              type="normal"
              containerStyle={speedupActionContainerStyle}
              style={actionStyle}
              onPress={() => onSpeedUpAction(true, tx)}
            >
              {strings('transaction.speedup')}
            </StyledButton>
          )}
          <StyledButton
            type="cancel"
            containerStyle={actionContainerStyle}
            style={actionStyle}
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
            containerStyle={speedupActionContainerStyle}
            style={actionStyle}
            onPress={() => signQRTransaction(tx)}
          >
            {strings('transaction.sign_with_keystone')}
          </StyledButton>
          <StyledButton
            type="cancel"
            containerStyle={speedupActionContainerStyle}
            style={actionStyle}
            onPress={() => cancelUnsignedQRTransaction(tx)}
          >
            {strings('transaction.cancel')}
          </StyledButton>
        </>
      )}
      {renderLedgerActions && (
        <StyledButton
          type="normal"
          containerStyle={speedupActionContainerStyle}
          style={actionStyle}
          onPress={() => signLedgerTransaction({ id: tx.id })}
        >
          {strings('transaction.sign_with_ledger')}
        </StyledButton>
      )}
    </View>
  );
}
