import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
// Android only scrolls inside a BottomSheet through this one.
import { ScrollView } from 'react-native-gesture-handler';

import ModalSafeAreaProvider from '../../../../../../component-library/components-temp/ModalSafeAreaProvider';
import { strings } from '../../../../../../../locales/i18n';
import { selectPrivacyMode } from '../../../../../../selectors/preferencesController';
import Logger from '../../../../../../util/Logger';
import { getHardwareTier } from '../../../../../../util/deviceCapability';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { useBalance } from '../../../hooks/useBalance';
import { PredictError, PredictErrorCode } from '../../../errors';
import type {
  PredictAmount,
  PredictVenueId,
  PredictWithdrawPreview,
  PredictWithdrawPreviewParams,
  PredictWithdrawReceipt,
} from '../../../types';
import type { PredictFundingService } from '../../../services/PredictFundingService';

import { PredictWithdrawFlowTestIds } from './PredictWithdrawFlow.testIds';
import { WithdrawAmountStep } from './WithdrawAmountStep';
import { WithdrawConfirmStep } from './WithdrawConfirmStep';
import { WithdrawStatusStep } from './WithdrawStatusStep';
import {
  sanitizeWithdrawAmount,
  sweepWithdrawAmountIssue,
  withdrawAmountIssue,
} from './withdrawAmount';

type WithdrawPhase = 'input' | 'confirm' | 'status';

const styles = StyleSheet.create({
  // The one raw View this flow needs: the host the Modal renders into.
  modalHost: { ...StyleSheet.absoluteFill },
});

/** The locale key for a Preview or Commit failure. The named codes are the
 * ones whose remedy differs; everything else retries with one generic line. */
const errorCopyKey = (error: PredictError): string => {
  switch (error.code) {
    case PredictErrorCode.PREVIEW_EXPIRED:
      return 'predict_next.withdraw.error.preview_expired';
    case PredictErrorCode.VENUE_ACCOUNT_NOT_ENABLED:
      return 'predict_next.withdraw.error.venue_account_not_enabled';
    case PredictErrorCode.VENUE_UNAVAILABLE:
    case PredictErrorCode.RATE_LIMITED:
      return 'predict_next.withdraw.error.venue_unavailable';
    default:
      return 'predict_next.withdraw.error.generic';
  }
};

const toPredictError = (error: unknown): PredictError =>
  error instanceof PredictError
    ? error
    : PredictError.from(PredictErrorCode.UNKNOWN);

interface PredictWithdrawFlowSheetProps {
  venueId: PredictVenueId;
  service: PredictFundingService;
  onClose: () => void;
}

/**
 * The one Withdraw sheet: enter an amount, confirm what the backend quoted,
 * then watch the receipt until it settles. The Venue owns every parameter
 * except the amount — the payout destination is resolved server-side — so this
 * flow has nothing to edit and nothing to sign.
 */
export const PredictWithdrawFlowSheet = ({
  venueId,
  service,
  onClose,
}: PredictWithdrawFlowSheetProps) => {
  const sheetRef = useRef<React.ComponentRef<typeof BottomSheet>>(null);
  const privacyMode = useSelector(selectPrivacyMode);
  const balanceQuery = useBalance(venueId);
  const networkTier = useNetworkTier();

  const [phase, setPhase] = useState<WithdrawPhase>('input');
  const [amount, setAmount] = useState('');
  const [isSweeping, setIsSweeping] = useState(false);
  const [preview, setPreview] = useState<PredictWithdrawPreview | null>(null);
  const [receipt, setReceipt] = useState<PredictWithdrawReceipt | null>(null);
  const [error, setError] = useState<PredictError | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  // Fences the async work of one sheet opening: a late Preview response must
  // not rewrite a flow the person has already moved past.
  const requestIdRef = useRef(0);

  const availableBalance = balanceQuery.data?.available;
  const isOffline = networkTier === 'NONE';
  const isLowHardware = getHardwareTier() === 'LOW';
  // A sweep asks for everything, so only the Venue's floor applies to it; a
  // typed amount is also checked against the cached balance.
  const sweepIssue = sweepWithdrawAmountIssue(availableBalance);
  const amountIssue = isSweeping
    ? sweepIssue
    : withdrawAmountIssue(amount, availableBalance);
  const canSweep = availableBalance !== undefined && sweepIssue === null;
  const canReview =
    !isOffline &&
    !isRequesting &&
    (isSweeping ? canSweep : amountIssue === null && amount.length > 0);

  useEffect(() => {
    sheetRef.current?.onOpenBottomSheet();
  }, []);

  const previewId = receipt?.previewId;
  /** Once the receipt exists this sheet is one of its observers: the service
   * owns the backoff schedule and replays the last receipt it holds. */
  useEffect(() => {
    if (!previewId) {
      return undefined;
    }
    return service.followOperation(previewId, {
      onReceipt: setReceipt,
      getNetworkTier: () => networkTier,
    });
  }, [service, previewId, networkTier]);

  const handleAmountChange = useCallback((next: string) => {
    setError(null);
    setIsSweeping(false);
    setAmount(sanitizeWithdrawAmount(next));
  }, []);

  const handleMax = useCallback(() => {
    setError(null);
    setAmount('');
    setIsSweeping(true);
  }, []);

  const handleReview = useCallback(async () => {
    if (!canReview) {
      return;
    }
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setError(null);
    setIsRequesting(true);
    const params: PredictWithdrawPreviewParams = isSweeping
      ? { sweepAll: true }
      : { amount: amount as PredictAmount };
    try {
      const quoted = await service.requestWithdrawPreview(venueId, params);
      if (requestIdRef.current !== requestId) {
        return;
      }
      setPreview(quoted);
      setPhase('confirm');
    } catch (caught) {
      if (requestIdRef.current !== requestId) {
        return;
      }
      Logger.log('PredictNext: the Withdraw Preview failed', caught);
      setError(toPredictError(caught));
    } finally {
      if (requestIdRef.current === requestId) {
        setIsRequesting(false);
      }
    }
  }, [amount, canReview, isSweeping, service, venueId]);

  /** Commits by reference: the phone sends the Preview id and nothing else,
   * and the receipt it returns is the operation's state from now on. */
  const handleConfirm = useCallback(async () => {
    if (!preview || isCommitting || isOffline) {
      return;
    }
    setError(null);
    setPhase('status');
    setIsCommitting(true);
    try {
      setReceipt(
        await service.commitWithdrawPreview(venueId, preview.previewId),
      );
    } catch (caught) {
      Logger.log('PredictNext: the Withdraw Commit failed', caught);
      setError(toPredictError(caught));
      setPhase('confirm');
    } finally {
      setIsCommitting(false);
    }
  }, [isCommitting, isOffline, preview, service, venueId]);

  const handleBack = useCallback(() => {
    setError(null);
    setPhase('input');
  }, []);

  const renderBody = () => {
    if (phase === 'status') {
      return receipt ? (
        <WithdrawStatusStep
          receipt={receipt}
          isPrivacyMode={Boolean(privacyMode)}
        />
      ) : (
        <Box
          twClassName="items-center justify-center py-8"
          testID={PredictWithdrawFlowTestIds.SUBMITTING}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('predict_next.withdraw.submitting')}
          </Text>
        </Box>
      );
    }
    if (phase === 'confirm' && preview) {
      return (
        <WithdrawConfirmStep
          preview={preview}
          isPrivacyMode={Boolean(privacyMode)}
        />
      );
    }
    return (
      <WithdrawAmountStep
        amount={amount}
        availableBalance={availableBalance}
        isSweeping={isSweeping}
        amountIssue={amountIssue}
        canSweep={canSweep}
        isOffline={isOffline}
        isRequesting={isRequesting}
        onAmountChange={handleAmountChange}
        onMax={handleMax}
      />
    );
  };

  const renderFooter = () => {
    if (phase === 'status') {
      return (
        <BottomSheetFooter
          primaryButtonProps={{
            children: strings('predict_next.withdraw.status.done'),
            onPress: onClose,
            testID: PredictWithdrawFlowTestIds.DONE,
          }}
        />
      );
    }
    if (phase === 'confirm') {
      return (
        <BottomSheetFooter
          primaryButtonProps={{
            children: strings('predict_next.withdraw.confirm'),
            onPress: handleConfirm,
            isDisabled: isOffline,
            isLoading: isCommitting && !isLowHardware,
            loadingText: strings('predict_next.withdraw.confirming'),
            testID: PredictWithdrawFlowTestIds.CONFIRM,
          }}
          secondaryButtonProps={{
            children: strings('predict_next.withdraw.back'),
            onPress: handleBack,
            testID: PredictWithdrawFlowTestIds.BACK,
          }}
        />
      );
    }
    return (
      <BottomSheetFooter
        primaryButtonProps={{
          // LOW hardware renders no spinner: the label alone says the request
          // is running, without non-essential animation.
          children: isRequesting
            ? strings('predict_next.withdraw.submitting')
            : strings('predict_next.withdraw.review'),
          onPress: handleReview,
          isDisabled: !canReview,
          isLoading: isRequesting && !isLowHardware,
          loadingText: strings('predict_next.withdraw.submitting'),
          testID: PredictWithdrawFlowTestIds.REVIEW,
        }}
      />
    );
  };

  return (
    <View pointerEvents="box-none" style={styles.modalHost}>
      <Modal
        visible
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <ModalSafeAreaProvider>
          <BottomSheet
            ref={sheetRef}
            onClose={onClose}
            testID={PredictWithdrawFlowTestIds.SHEET}
          >
            <BottomSheetHeader
              onClose={onClose}
              onBack={phase === 'confirm' ? handleBack : undefined}
              testID={PredictWithdrawFlowTestIds.HEADER}
            >
              {strings('predict_next.withdraw.title')}
            </BottomSheetHeader>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Box twClassName="gap-3 px-4 py-3">
                {renderBody()}
                {error === null ? null : (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.ErrorDefault}
                    testID={PredictWithdrawFlowTestIds.ERROR}
                  >
                    {strings(errorCopyKey(error))}
                  </Text>
                )}
              </Box>
            </ScrollView>
            {renderFooter()}
          </BottomSheet>
        </ModalSafeAreaProvider>
      </Modal>
    </View>
  );
};
