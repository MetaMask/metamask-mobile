import React, { useCallback, useReducer } from 'react';
import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { selectPredictBrandRefreshEnabled } from '../../../../../selectors/featureFlagController/predictBrandRefresh';
import Logger from '../../../../../util/Logger';
import { getHardwareTier } from '../../../../../util/deviceCapability';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { PredictKeypad } from '../../components/PredictAmountEntry';
import { useBalance } from '../../hooks/useBalance';
import { useWithdrawReceipt } from '../../hooks/useWithdrawReceipt';
import { PredictError, PredictErrorCode } from '../../errors';
import type { PredictNextStackParamList } from '../../navigation/types';
import type {
  PredictAmount,
  PredictVenueId,
  PredictWithdrawPreview,
  PredictWithdrawPreviewParams,
  PredictWithdrawReceipt,
} from '../../types';

import { PredictWithdrawFlowTestIds } from './internal/PredictWithdrawFlow.testIds';
import { WithdrawAmountStep } from './internal/WithdrawAmountStep';
import { WithdrawConfirmStep } from './internal/WithdrawConfirmStep';
import { WithdrawStatusStep } from './internal/WithdrawStatusStep';
import {
  normalizeWithdrawAmount,
  sanitizeWithdrawAmount,
  withdrawAmountIssue,
} from './internal/withdrawAmount';

/** The amount the person is entering, carried through every phase so a failed
 * Commit still knows what was being withdrawn: the same confirmation for a
 * transient failure, the entry step for an expired quote. */
interface WithdrawAmountInput {
  amount: string;
}

/**
 * The screen's phases are a state machine: an amount can be edited, a quoted
 * Preview can be committed, and a committed Withdrawal reports its receipt.
 * Each phase carries exactly the fields it can use, so an unreachable
 * combination (a receipt in the amount step, a quote in the status step) has
 * no representation.
 */
type WithdrawFlowState =
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

type WithdrawFlowAction =
  | { type: 'editAmount'; amount: string }
  | { type: 'request' }
  | { type: 'quoted'; preview: PredictWithdrawPreview }
  | { type: 'requestFailed'; error: PredictError }
  | { type: 'confirm' }
  | { type: 'committed'; receipt: PredictWithdrawReceipt }
  | { type: 'commitFailed'; error: PredictError }
  | { type: 'back' }
  | { type: 'receipt'; receipt: PredictWithdrawReceipt };

const initialWithdrawFlowState: WithdrawFlowState = {
  phase: 'input',
  input: { amount: '' },
  isRequesting: false,
  error: null,
};

const withdrawFlowReducer = (
  state: WithdrawFlowState,
  action: WithdrawFlowAction,
): WithdrawFlowState => {
  switch (action.type) {
    case 'editAmount':
      return state.phase === 'input'
        ? {
            ...state,
            input: { amount: action.amount },
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
      if (state.phase !== 'status') {
        return state;
      }
      // An expired quote can never be committed again, so the retry that
      // makes sense is a new quote: keep the amount, drop the stale Preview.
      return action.error.code === PredictErrorCode.PREVIEW_EXPIRED
        ? {
            phase: 'input',
            input: state.input,
            isRequesting: false,
            error: action.error,
          }
        : {
            phase: 'confirm',
            input: state.input,
            preview: state.preview,
            error: action.error,
          };
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

/**
 * The one Withdraw screen: enter an amount on the keypad, confirm what the
 * backend quoted, then watch the receipt until it settles. The Venue owns
 * every parameter except the amount — the payout destination is resolved
 * server-side — so this flow has nothing to send and nothing to sign.
 */
export const PredictWithdrawScreen = () => {
  const tw = useTailwind();
  const navigation =
    useNavigation<NativeStackNavigationProp<PredictNextStackParamList>>();
  const route =
    useRoute<RouteProp<PredictNextStackParamList, 'PredictNextWithdraw'>>();
  const venueId: PredictVenueId = route.params.venueId;
  const service = Engine.context.PredictFundingService;
  const privacyMode = useSelector(selectPrivacyMode) === true;
  const isGlassHeader = useSelector(selectPredictBrandRefreshEnabled) === true;
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
  const amountIssue = withdrawAmountIssue(input.amount, availableBalance);
  const canContinue =
    state.phase === 'input' &&
    !isOffline &&
    !state.isRequesting &&
    amountIssue === null &&
    input.amount.length > 0;
  const isKeypadLocked =
    state.phase !== 'input' || state.isRequesting || isOffline;

  const close = useCallback(() => navigation.goBack(), [navigation]);

  const handleReceipt = useCallback(
    (receipt: PredictWithdrawReceipt) => dispatch({ type: 'receipt', receipt }),
    [],
  );
  /** Once the Commit returns, this screen is the surface observing the
   * Withdrawal: the hook owns the backoff schedule and stops on a terminal
   * receipt, on manual review, or when the screen unmounts. */
  useWithdrawReceipt({
    service,
    venueId,
    receipt: state.phase === 'status' ? state.receipt : null,
    networkTier,
    onReceipt: handleReceipt,
  });

  const handleKeyPress = useCallback(
    (key: string) => {
      if (isKeypadLocked) {
        return;
      }
      dispatch({
        type: 'editAmount',
        amount: sanitizeWithdrawAmount(`${input.amount}${key}`),
      });
    },
    [input.amount, isKeypadLocked],
  );

  const handleDelete = useCallback(() => {
    if (isKeypadLocked) {
      return;
    }
    dispatch({
      type: 'editAmount',
      amount: sanitizeWithdrawAmount(input.amount.slice(0, -1)),
    });
  }, [input.amount, isKeypadLocked]);

  const handleContinue = useCallback(async () => {
    if (!canContinue) {
      return;
    }
    dispatch({ type: 'request' });
    const params: PredictWithdrawPreviewParams = {
      amount: normalizeWithdrawAmount(input.amount) as PredictAmount,
    };
    try {
      dispatch({
        type: 'quoted',
        preview: await service.requestWithdrawPreview(venueId, params),
      });
    } catch (caught) {
      Logger.log('PredictNext: the Withdraw Preview failed', caught);
      dispatch({ type: 'requestFailed', error: toPredictError(caught) });
    }
  }, [canContinue, input, service, venueId]);

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

  const renderInput = () => {
    if (state.phase !== 'input') {
      return null;
    }
    return (
      <>
        <Box twClassName="flex-1">
          <WithdrawAmountStep
            amount={input.amount}
            availableBalance={availableBalance}
            amountIssue={amountIssue}
            isPrivacyMode={privacyMode}
          />
        </Box>
        <Box twClassName="gap-3 px-4 pb-2">
          {state.error !== null ? (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.ErrorDefault}
              testID={PredictWithdrawFlowTestIds.ERROR}
            >
              {strings(errorCopyKey(state.error))}
            </Text>
          ) : null}
          {isOffline ? (
            <BannerAlert
              severity={BannerAlertSeverity.Warning}
              description={strings('predict_next.withdraw.offline')}
              testID={PredictWithdrawFlowTestIds.OFFLINE_BANNER}
            />
          ) : null}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="justify-between gap-3"
            testID={PredictWithdrawFlowTestIds.RECEIVE}
          >
            <Text variant={TextVariant.BodyMd}>
              {strings('predict_next.withdraw.receive_row')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              testID={PredictWithdrawFlowTestIds.RECEIVE_VALUE}
            >
              {strings('predict_next.withdraw.receive_sandbox_wallet')}
            </Text>
          </Box>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleContinue}
            isDisabled={!canContinue}
            // LOW hardware renders no spinner: the label alone says the
            // request is running, without non-essential animation.
            isLoading={state.isRequesting && !isLowHardware}
            loadingText={strings('predict_next.withdraw.submitting')}
            testID={PredictWithdrawFlowTestIds.CONTINUE}
          >
            {state.isRequesting
              ? strings('predict_next.withdraw.submitting')
              : strings('predict_next.withdraw.continue')}
          </Button>
        </Box>
        <PredictKeypad
          onKeyPress={handleKeyPress}
          onDelete={handleDelete}
          hasFilledActionKeys
        />
      </>
    );
  };

  const renderConfirm = () =>
    state.phase === 'confirm' ? (
      <>
        <ScrollView contentContainerStyle={tw.style('gap-3 px-4 pt-4 pb-4')}>
          <WithdrawConfirmStep
            preview={state.preview}
            isPrivacyMode={privacyMode}
          />
          {state.error !== null ? (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.ErrorDefault}
              testID={PredictWithdrawFlowTestIds.ERROR}
            >
              {strings(errorCopyKey(state.error))}
            </Text>
          ) : null}
        </ScrollView>
        <Box twClassName="gap-3 px-4 pb-4">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleConfirm}
            isDisabled={isOffline}
            testID={PredictWithdrawFlowTestIds.CONFIRM}
          >
            {strings('predict_next.withdraw.confirm')}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleBack}
            testID={PredictWithdrawFlowTestIds.BACK}
          >
            {strings('predict_next.withdraw.back')}
          </Button>
        </Box>
      </>
    ) : null;

  const renderStatus = () =>
    state.phase === 'status' ? (
      <>
        <ScrollView contentContainerStyle={tw.style('gap-3 px-4 pt-6 pb-4')}>
          {state.receipt ? (
            <WithdrawStatusStep
              receipt={state.receipt}
              isPrivacyMode={privacyMode}
            />
          ) : (
            <Box
              twClassName="items-center justify-center py-8"
              testID={PredictWithdrawFlowTestIds.SUBMITTING}
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('predict_next.withdraw.submitting')}
              </Text>
            </Box>
          )}
        </ScrollView>
        <Box twClassName="px-4 pb-4">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={close}
            testID={PredictWithdrawFlowTestIds.DONE}
          >
            {strings('predict_next.withdraw.status.done')}
          </Button>
        </Box>
      </>
    ) : null;

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={PredictWithdrawFlowTestIds.SCREEN}
    >
      <Box testID={PredictWithdrawFlowTestIds.HEADER}>
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          includesTopInset
          title={strings('predict_next.withdraw.title')}
          onBack={state.phase === 'confirm' ? handleBack : close}
          backButtonProps={{ testID: PredictWithdrawFlowTestIds.BACK }}
        />
      </Box>
      <Box twClassName="flex-1">
        {renderInput()}
        {renderConfirm()}
        {renderStatus()}
      </Box>
    </SafeAreaView>
  );
};
