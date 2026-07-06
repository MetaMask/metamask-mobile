import React from 'react';
import { type TransactionMeta } from '@metamask/transaction-controller';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  IconColor,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../locales/i18n';
import PendingSpinner from '../../../UI/Money/components/PendingSpinner/PendingSpinner';
import {
  getPendingTxActionVisibility,
  hasAnyPendingTxAction,
} from '../../../UI/Transactions/pendingTxActions';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';

export interface ActivityDetailsPendingBannerProps {
  tx: TransactionMeta;
  isQRHardwareAccount: boolean;
  isLedgerAccount: boolean;
  onSpeedUpAction: (open: boolean, tx?: TransactionMeta) => void;
  onCancelAction: (open: boolean, tx?: TransactionMeta) => void;
  signQRTransaction: (tx: TransactionMeta) => void;
  signLedgerTransaction: (tx: Pick<TransactionMeta, 'id'>) => void;
  cancelUnsignedQRTransaction: (tx: TransactionMeta) => void;
}

/**
 * Pending-transaction banner for the redesigned transaction details screen:
 * a "Transaction pending" card with a confirm-time estimate and the speed-up /
 * cancel (or hardware-wallet sign) actions. Visibility + handlers mirror the
 * activity list row via the shared {@link getPendingTxActionVisibility} gate;
 * the speed-up / cancel confirmation sheet is rendered by the parent screen.
 *
 * The "< 30 sec" estimate matches the design (extension) and is static — mobile
 * has no per-transaction confirm-time estimator today.
 */
export function ActivityDetailsPendingBanner({
  tx,
  isQRHardwareAccount,
  isLedgerAccount,
  onSpeedUpAction,
  onCancelAction,
  signQRTransaction,
  signLedgerTransaction,
  cancelUnsignedQRTransaction,
}: ActivityDetailsPendingBannerProps) {
  const visibility = getPendingTxActionVisibility(tx, {
    isQRHardwareAccount,
    isLedgerAccount,
  });

  if (!hasAnyPendingTxAction(visibility)) {
    return null;
  }

  const { showSpeedUpCancel, showQRSign, showLedgerSign } = visibility;

  return (
    <Box
      twClassName="rounded-2xl bg-muted p-4 mb-4 gap-3"
      testID={ActivityDetailsSelectorsIDs.PENDING_BANNER}
    >
      <Box twClassName="flex-row items-center gap-2">
        <PendingSpinner size={IconSize.Sm} color={IconColor.Default} />
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {strings('activity_details.transaction_pending')}
        </Text>
      </Box>

      <Box twClassName="flex-row items-center justify-between">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('activity_details.likely_to_confirm_in')}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('activity_details.confirm_time_estimate')}
        </Text>
      </Box>

      {showSpeedUpCancel ? (
        <Box twClassName="flex-row gap-3">
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isDanger
            twClassName="flex-1"
            onPress={() => onCancelAction(true, tx)}
            testID={ActivityDetailsSelectorsIDs.PENDING_CANCEL_BUTTON}
          >
            {strings('transaction.cancel')}
          </Button>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            twClassName="flex-1"
            onPress={() => onSpeedUpAction(true, tx)}
            testID={ActivityDetailsSelectorsIDs.PENDING_SPEED_UP_BUTTON}
          >
            {strings('transaction.speedup')}
          </Button>
        </Box>
      ) : null}

      {showQRSign ? (
        <Box twClassName="flex-row gap-3">
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isDanger
            twClassName="flex-1"
            onPress={() => cancelUnsignedQRTransaction(tx)}
            testID={ActivityDetailsSelectorsIDs.PENDING_QR_CANCEL_BUTTON}
          >
            {strings('transaction.cancel')}
          </Button>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            twClassName="flex-1"
            onPress={() => signQRTransaction(tx)}
            testID={ActivityDetailsSelectorsIDs.PENDING_QR_SIGN_BUTTON}
          >
            {strings('transaction.sign_with_keystone')}
          </Button>
        </Box>
      ) : null}

      {showLedgerSign ? (
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          twClassName="w-full"
          onPress={() => signLedgerTransaction({ id: tx.id })}
          testID={ActivityDetailsSelectorsIDs.PENDING_LEDGER_SIGN_BUTTON}
        >
          {strings('transaction.sign_with_ledger')}
        </Button>
      ) : null}
    </Box>
  );
}
