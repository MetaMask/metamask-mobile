import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, TouchableOpacity } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { selectEvmAddress } from '../../../../../selectors/accountsController';
import { useDepositStatus } from '../../hooks/useDepositStatus';
import type {
  PredictDepositOperation,
  PredictHex,
  PredictVenueId,
} from '../../types';
import {
  DepositInProgressSheet,
  useDepositEnvironment,
  useDepositFlow,
} from '../../views/PredictDeposit';

const ADDRESS_POLL_INTERVAL_MS = 2_000;

// A BodySm line is 22pt tall; 11pt above and below makes a 44pt target.
const STATUS_LINE_HIT_SLOP = { top: 11, bottom: 11 };

interface DepositStatusLineProps {
  venueId: PredictVenueId;
  testID: string;
}

const statusCopy = (
  deposit: PredictDepositOperation,
): { label: string; color: TextColor } | null => {
  switch (deposit.status) {
    case 'awaiting_transfer':
      return {
        label: strings('predict_next.deposit.status.awaiting_transfer'),
        color: TextColor.PrimaryDefault,
      };
    case 'processing':
      return {
        label: strings('predict_next.deposit.status.processing'),
        color: TextColor.TextAlternative,
      };
    case 'under_review':
      return {
        label: strings('predict_next.deposit.status.under_review', {
          reference: deposit.operationId.slice(0, 8),
        }),
        color: TextColor.WarningDefault,
      };
    case 'failed':
      return {
        label: strings('predict_next.deposit.status.failed'),
        color: TextColor.ErrorDefault,
      };
    case 'cancelled':
      return {
        label: strings('predict_next.deposit.status.cancelled'),
        color: TextColor.TextAlternative,
      };
    default:
      return null;
  }
};

const isOneTimeNotice = (deposit: PredictDepositOperation): boolean =>
  deposit.status === 'failed' || deposit.status === 'cancelled';

const isAnnouncedStatus = (deposit: PredictDepositOperation): boolean =>
  deposit.status === 'processing' ||
  deposit.status === 'under_review' ||
  isOneTimeNotice(deposit);

/**
 * The status line swaps its text in place, and iOS VoiceOver ignores
 * `accessibilityLiveRegion`, so changes are announced explicitly. Only the
 * focused surface announces, because Home stays mounted under Portfolio. An
 * open status already showing on mount is not announced; a `failed` or
 * `cancelled` notice is, because it is shown once and then cleared.
 */
const useDepositStatusAnnouncement = (
  deposit: PredictDepositOperation | null,
  label: string | undefined,
): void => {
  const isFocused = useIsFocused();
  const statusKey = deposit ? `${deposit.operationId}:${deposit.status}` : null;
  const previousKeyRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const previousKey = previousKeyRef.current;
    previousKeyRef.current = statusKey;
    if (
      statusKey === previousKey ||
      !isFocused ||
      !deposit ||
      !label ||
      !isAnnouncedStatus(deposit)
    ) {
      return;
    }
    if (previousKey === undefined && !isOneTimeNotice(deposit)) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(label);
  }, [deposit, isFocused, label, statusKey]);
};

interface DepositStatusSheetHostProps {
  venueId: PredictVenueId;
  deposit: PredictDepositOperation;
  onClose: () => void;
}

/** Mounted only when the user taps an `awaiting_transfer` status line so Home
 * and Portfolio do not mount deposit flow hooks on every render. */
const DepositStatusSheetHost = ({
  venueId,
  deposit,
  onClose,
}: DepositStatusSheetHostProps): React.JSX.Element => {
  const fundingWallet = useSelector(selectEvmAddress) as PredictHex | undefined;
  const environment = useDepositEnvironment();
  const flow = useDepositFlow({
    venueId,
    environment,
    fundingWallet,
    addressPollIntervalMs: ADDRESS_POLL_INTERVAL_MS,
  });
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelFailed, setCancelFailed] = useState(false);

  const continueDeposit = useCallback(
    async (target: PredictDepositOperation) => {
      onClose();
      await flow.payOpenDeposit(target);
    },
    [flow, onClose],
  );

  const cancelDeposit = useCallback(
    async (target: PredictDepositOperation) => {
      setIsCancelling(true);
      setCancelFailed(false);
      const cancelled = await flow.cancelOpenDeposit(target);
      if (cancelled) {
        onClose();
      } else {
        setIsCancelling(false);
        setCancelFailed(true);
      }
    },
    [flow, onClose],
  );

  return (
    <DepositInProgressSheet
      deposit={deposit}
      hasSubmittedTransfer={flow.hasSubmittedTransfer(deposit)}
      isCancelling={isCancelling}
      cancelFailed={cancelFailed}
      onContinue={continueDeposit}
      onCancel={cancelDeposit}
      onClose={onClose}
    />
  );
};

/**
 * Displays the active Kalshi deposit status line under the balance on Predict
 * Home and inside the Portfolio summary card. Tapping `awaiting_transfer`
 * opens `DepositInProgressSheet` with Continue and Cancel.
 */
export const DepositStatusLine = ({
  venueId,
  testID,
}: DepositStatusLineProps): React.JSX.Element | null => {
  const deposit = useDepositStatus(venueId);
  const [sheetDeposit, setSheetDeposit] = useState<
    PredictDepositOperation | undefined
  >();

  const openSheet = useCallback(() => {
    if (deposit?.status === 'awaiting_transfer') {
      setSheetDeposit(deposit);
    }
  }, [deposit]);

  const closeSheet = useCallback(() => setSheetDeposit(undefined), []);

  const copy = deposit ? statusCopy(deposit) : null;
  const isInteractive = deposit?.status === 'awaiting_transfer';
  useDepositStatusAnnouncement(deposit, copy?.label);

  if (!copy && !sheetDeposit) {
    return null;
  }

  return (
    <>
      {copy ? (
        isInteractive ? (
          <TouchableOpacity
            onPress={openSheet}
            hitSlop={STATUS_LINE_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={copy.label}
            testID={testID}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={1}
            >
              <Text variant={TextVariant.BodySm} color={copy.color}>
                {copy.label}
              </Text>
              <Icon
                name={IconName.ArrowRight}
                size={IconSize.Xs}
                color={IconColor.PrimaryDefault}
              />
            </Box>
          </TouchableOpacity>
        ) : (
          <Text variant={TextVariant.BodySm} color={copy.color} testID={testID}>
            {copy.label}
          </Text>
        )
      ) : null}
      {sheetDeposit ? (
        <DepositStatusSheetHost
          venueId={venueId}
          deposit={sheetDeposit}
          onClose={closeSheet}
        />
      ) : null}
    </>
  );
};
