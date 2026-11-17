import React, { useCallback, useEffect, useReducer, useRef } from 'react';
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

import { strings } from '../../../../../../../locales/i18n';
import { selectPrivacyMode } from '../../../../../../selectors/preferencesController';
import Logger from '../../../../../../util/Logger';
import { getHardwareTier } from '../../../../../../util/deviceCapability';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { PredictFlowSheetHost } from '../../../components/PredictFlowSheetHost';
import { useBalance } from '../../../hooks/useBalance';
import { useWithdrawReceipt } from '../../../hooks/useWithdrawReceipt';
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
  normalizeWithdrawAmount,
  sanitizeWithdrawAmount,
  sweepWithdrawAmountIssue,
  withdrawAmountIssue,
} from './withdrawAmount';

/** The amount the person is entering, carried through every phase so a failed
 * Commit returns to a confirmation that still knows what it was confirming. */
interface WithdrawAmountInput {
  amount: string;
  isSweeping: boolean;
}

/**
 * The sheet's phases are a state machine: an amount can be edited, a quoted
 * Preview can be committed, and a committed Withdrawal reports its receipt.
 * Each phase carries exactly the fields it can use, so an unreachable
 * combination (a receipt in the amount step, a quote in the status step) has
 * no representation.
 */
export type WithdrawFlowState =
  | {
      phase: 'input';
      input: WithdrawAmountInput;
      isRequesting: boolean;
      error: PredictError | null;
    }
  | {
      phase: 'confirm';
      input: WithdrawAmountInput;
      preview: PredictWithdrawPreview;
      error: PredictError | null;
    }
  | {
      phase: 'status';
      input: WithdrawAmountInput;
      preview: PredictWithdrawPreview;
      receipt: PredictWithdrawReceipt | null;
    };

export type WithdrawFlowAction =
  | { type: 'editAmount'; amount: string }
  | { type: 'sweep' }
  | { type: 'request' }
  | { type: 'quoted'; preview: PredictWithdrawPreview }
  | { type: 'requestFailed'; error: PredictError }
  | { type: 'confirm' }
  | { type: 'committed'; receipt: PredictWithdrawReceipt }
  | { type: 'commitFailed'; error: PredictError }
  | { type: 'back' }
  | { type: 'receipt'; receipt: PredictWithdrawReceipt };

export const initialWithdrawFlowState: WithdrawFlowState = {
  phase: 'input',
  input: { amount: '', isSweeping: false },
  isRequesting: false,
  error: null,
};

export const withdrawFlowReducer = (
  state: WithdrawFlowState,
  action: WithdrawFlowAction,
): WithdrawFlowState => {
  switch (action.type) {
    case 'editAmount':
      return state.phase === 'input'
        ? {
            ...state,
            input: { amount: action.amount, isSweeping: false },
            error: null,
          }
        : state;
    case 'sweep':
      return state.phase === 'input'
        ? {
            ...state,
            input: { amount: '', isSweeping: true },
            error: null,
          }
        : state;
    case 'request':
      return state.phase === 'input'
        ? { ...state, isRequesting: true, error: null }
        : state;
    case 'quoted':
      return state.phase === 'input'
        ? {
            phase: 'confirm',
            input: state.input,
            preview: action.preview,
            error: null,
          }
        : state;
    case 'requestFailed':
      return state.phase === 'input'
        ? { ...state, isRequesting: false, error: action.error }
        : state;
    case 'confirm':
      return state.phase === 'confirm'
        ? {
            phase: 'status',
            input: state.input,
            preview: state.preview,
            receipt: null,
          }
        : state;
    case 'committed':
      return state.phase === 'status'
        ? { ...state, receipt: action.receipt }
        : state;
    case 'commitFailed':
      return state.phase === 'status'
        ? {
            phase: 'confirm',
            input: state.input,
            preview: state.preview,
            error: action.error,
          }
        : state;
    case 'back':
      return state.phase === 'confirm'
        ? {
            phase: 'input',
            input: state.input,
            isRequesting: false,
            error: null,
          }
        : state;
    case 'receipt':
      return state.phase === 'status'
        ? { ...state, receipt: action.receipt }
        : state;
  }
};

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
  const [state, dispatch] = useReducer(
    withdrawFlowReducer,
    initialWithdrawFlowState,
  );

  const { input } = state;
  const availableBalance = balanceQuery.data?.available;
  const isOffline = networkTier === 'NONE';
  const isLowHardware = getHardwareTier() === 'LOW';
  // A sweep asks for everything, so only the Venue's floor applies to it; a
  // typed amount is also checked against the cached balance.
  const sweepIssue = sweepWithdrawAmountIssue(availableBalance);
  const amountIssue = input.isSweeping
    ? sweepIssue
    : withdrawAmountIssue(input.amount, availableBalance);
  const canSweep = availableBalance !== undefined && sweepIssue === null;
  const canReview =
    state.phase === 'input' &&
    !isOffline &&
    !state.isRequesting &&
    (input.isSweeping
      ? canSweep
      : amountIssue === null && input.amount.length > 0);

  useEffect(() => {
    sheetRef.current?.onOpenBottomSheet();
  }, []);

  const handleReceipt = useCallback(
    (receipt: PredictWithdrawReceipt) => dispatch({ type: 'receipt', receipt }),
    [],
  );
  /** Once the Commit returns, this sheet is the surface observing the
   * Withdrawal: the hook owns the backoff schedule and stops on a terminal
   * receipt, on manual review, or when the sheet unmounts. */
  useWithdrawReceipt({
    service,
    venueId,
    receipt: state.phase === 'status' ? state.receipt : null,
    networkTier,
    onReceipt: handleReceipt,
  });

  const handleAmountChange = useCallback(
    (next: string) =>
      dispatch({ type: 'editAmount', amount: sanitizeWithdrawAmount(next) }),
    [],
  );

  const handleMax = useCallback(() => dispatch({ type: 'sweep' }), []);

  const handleReview = useCallback(async () => {
    if (!canReview) {
      return;
    }
    dispatch({ type: 'request' });
    const params: PredictWithdrawPreviewParams = input.isSweeping
      ? { sweepAll: true }
      : { amount: normalizeWithdrawAmount(input.amount) as PredictAmount };
    try {
      dispatch({
        type: 'quoted',
        preview: await service.requestWithdrawPreview(venueId, params),
      });
    } catch (caught) {
      Logger.log('PredictNext: the Withdraw Preview failed', caught);
      dispatch({ type: 'requestFailed', error: toPredictError(caught) });
    }
  }, [canReview, input, service, venueId]);

  /** Commits by reference: the phone sends the Preview id and nothing else,
   * and the receipt it returns is the operation's state from now on. */
  const handleConfirm = useCallback(async () => {
    if (state.phase !== 'confirm' || isOffline) {
      return;
    }
    const { preview } = state;
    dispatch({ type: 'confirm' });
    try {
      dispatch({
        type: 'committed',
        receipt: await service.commitWithdrawPreview(
          venueId,
          preview.previewId,
        ),
      });
    } catch (caught) {
      Logger.log('PredictNext: the Withdraw Commit failed', caught);
      dispatch({ type: 'commitFailed', error: toPredictError(caught) });
    }
  }, [isOffline, service, state, venueId]);

  const handleBack = useCallback(() => dispatch({ type: 'back' }), []);

  const renderBody = () => {
    if (state.phase === 'status') {
      return state.receipt ? (
        <WithdrawStatusStep
          receipt={state.receipt}
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
    if (state.phase === 'confirm') {
      return (
        <WithdrawConfirmStep
          preview={state.preview}
          isPrivacyMode={Boolean(privacyMode)}
        />
      );
    }
    return (
      <WithdrawAmountStep
        amount={input.amount}
        availableBalance={availableBalance}
        isSweeping={input.isSweeping}
        amountIssue={amountIssue}
        canSweep={canSweep}
        isOffline={isOffline}
        isRequesting={state.isRequesting}
        onAmountChange={handleAmountChange}
        onMax={handleMax}
      />
    );
  };

  const renderFooter = () => {
    if (state.phase === 'status') {
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
    if (state.phase === 'confirm') {
      return (
        <BottomSheetFooter
          primaryButtonProps={{
            children: strings('predict_next.withdraw.confirm'),
            onPress: handleConfirm,
            isDisabled: isOffline,
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
          children: state.isRequesting
            ? strings('predict_next.withdraw.submitting')
            : strings('predict_next.withdraw.review'),
          onPress: handleReview,
          isDisabled: !canReview,
          isLoading: state.isRequesting && !isLowHardware,
          loadingText: strings('predict_next.withdraw.submitting'),
          testID: PredictWithdrawFlowTestIds.REVIEW,
        }}
      />
    );
  };

  return (
    <PredictFlowSheetHost onClose={onClose}>
      <BottomSheet
        ref={sheetRef}
        onClose={onClose}
        testID={PredictWithdrawFlowTestIds.SHEET}
      >
        <BottomSheetHeader
          onClose={onClose}
          onBack={state.phase === 'confirm' ? handleBack : undefined}
          testID={PredictWithdrawFlowTestIds.HEADER}
        >
          {strings('predict_next.withdraw.title')}
        </BottomSheetHeader>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Box twClassName="gap-3 px-4 py-3">
            {renderBody()}
            {state.phase !== 'status' && state.error !== null ? (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.ErrorDefault}
                testID={PredictWithdrawFlowTestIds.ERROR}
              >
                {strings(errorCopyKey(state.error))}
              </Text>
            ) : null}
          </Box>
        </ScrollView>
        {renderFooter()}
      </BottomSheet>
    </PredictFlowSheetHost>
  );
};
