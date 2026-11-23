import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, TouchableOpacity } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
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
// The copy icon is 12pt wide; 16pt on each side makes a 44pt target.
const COPY_ICON_HIT_SLOP = { ...STATUS_LINE_HIT_SLOP, left: 16, right: 16 };

const styles = StyleSheet.create({
  referenceText: {
    writingDirection: 'ltr',
  },
});

const getSupportReference = (deposit: PredictDepositOperation): string =>
  deposit.next?.kind === 'review'
    ? deposit.next.supportReference
    : deposit.operationId;

const copySupportReference = (reference: string): void => {
  Clipboard.setString(reference);
  AccessibilityInfo.announceForAccessibility(
    strings('predict_next.deposit.status.reference_copied'),
  );
};

interface DepositStatusLineProps {
  venueId: PredictVenueId;
  testID: string;
}

const statusCopy = (
  deposit: PredictDepositOperation,
): { label: string; color: TextColor; supportReference?: string } | null => {
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
    case 'under_review': {
      const supportReference = getSupportReference(deposit);
      return {
        label: strings('predict_next.deposit.status.under_review', {
          reference: supportReference,
        }),
        color: TextColor.WarningDefault,
        supportReference,
      };
    }
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
  isVisible: boolean;
  onHide: () => void;
  onClose: () => void;
}

/** Mounted only when the user taps an `awaiting_transfer` status line so Home
 * and Portfolio do not mount deposit flow hooks on every render. */
const DepositStatusSheetHost = ({
  venueId,
  deposit,
  isVisible,
  onHide,
  onClose,
}: DepositStatusSheetHostProps): React.JSX.Element => {
  const fundingWallet = useSelector(selectEvmAddress) as PredictHex | undefined;
  const environmentResolution = useDepositEnvironment(venueId);
  const isEnvironmentReady = environmentResolution.status === 'ready';
  const environment = isEnvironmentReady
    ? environmentResolution.environment
    : undefined;
  const flow = useDepositFlow({
    venueId,
    environment,
    fundingWallet,
    addressPollIntervalMs: ADDRESS_POLL_INTERVAL_MS,
  });
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelFailed, setCancelFailed] = useState(false);

  const continueDeposit = useCallback(
    (target: PredictDepositOperation) => {
      if (!isEnvironmentReady) {
        return;
      }
      onHide();
      void (async () => {
        try {
          await flow.payOpenDeposit(target);
        } finally {
          onClose();
        }
      })();
    },
    [flow, isEnvironmentReady, onClose, onHide],
  );

  const cancelDeposit = useCallback(
    (target: PredictDepositOperation) => {
      setIsCancelling(true);
      setCancelFailed(false);
      void (async () => {
        const cancelled = await flow.cancelOpenDeposit(target);
        if (cancelled) {
          onClose();
        } else {
          setIsCancelling(false);
          setCancelFailed(true);
        }
      })();
    },
    [flow, onClose],
  );

  return (
    <DepositInProgressSheet
      deposit={deposit}
      hasSubmittedTransfer={flow.hasSubmittedTransfer(deposit)}
      canContinue={isEnvironmentReady}
      canCancel={Boolean(fundingWallet)}
      isVisible={isVisible}
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
  const [sheetOperationId, setSheetOperationId] = useState<string | null>(null);
  const [isSheetVisible, setIsSheetVisible] = useState(true);

  const openSheet = useCallback(() => {
    if (deposit?.status === 'awaiting_transfer') {
      setIsSheetVisible(true);
      setSheetOperationId(deposit.operationId);
    }
  }, [deposit]);

  const hideSheet = useCallback(() => setIsSheetVisible(false), []);
  const closeSheet = useCallback(() => {
    setSheetOperationId(null);
    setIsSheetVisible(true);
  }, []);

  const liveSheetDeposit =
    sheetOperationId !== null && deposit?.operationId === sheetOperationId
      ? deposit
      : null;

  const copy = deposit ? statusCopy(deposit) : null;
  const isInteractive = deposit?.status === 'awaiting_transfer';
  useDepositStatusAnnouncement(deposit, copy?.label);

  if (!copy && !liveSheetDeposit) {
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
        ) : copy.supportReference ? (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            <Text
              variant={TextVariant.BodySm}
              color={copy.color}
              twClassName="shrink"
              testID={testID}
            >
              {strings('predict_next.deposit.status.under_review_label')}{' '}
              <Text
                variant={TextVariant.BodySm}
                color={copy.color}
                style={styles.referenceText}
              >
                {copy.supportReference}
              </Text>
            </Text>
            <TouchableOpacity
              onPress={() => copySupportReference(copy.supportReference ?? '')}
              hitSlop={COPY_ICON_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={strings(
                'predict_next.deposit.status.copy_reference',
              )}
              testID={`${testID}-copy`}
            >
              <Icon
                name={IconName.Copy}
                size={IconSize.Xs}
                color={IconColor.WarningDefault}
              />
            </TouchableOpacity>
          </Box>
        ) : (
          <Text variant={TextVariant.BodySm} color={copy.color} testID={testID}>
            {copy.label}
          </Text>
        )
      ) : null}
      {liveSheetDeposit ? (
        <DepositStatusSheetHost
          venueId={venueId}
          deposit={liveSheetDeposit}
          isVisible={isSheetVisible}
          onHide={hideSheet}
          onClose={closeSheet}
        />
      ) : null}
    </>
  );
};
