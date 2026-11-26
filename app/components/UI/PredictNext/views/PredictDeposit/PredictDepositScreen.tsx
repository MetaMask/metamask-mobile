import React, { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectPredictBrandRefreshEnabled } from '../../../../../selectors/featureFlagController/predictBrandRefresh';
import { selectEvmAddress } from '../../../../../selectors/accountsController';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import { PredictErrorCode } from '../../errors';
import type { DepositOutcome } from '../../funding';
import type { PredictNextStackParamList } from '../../navigation/types';
import type {
  PredictAmount,
  PredictDepositOperation,
  PredictHex,
} from '../../types';
import {
  PredictAmountDisplay,
  PredictKeypad,
} from '../../components/PredictAmountEntry';
import { DepositInProgressSheet } from './internal/DepositInProgressSheet';
import { DepositPayWithRow } from './internal/DepositPayWithRow';
import { DepositProcessing } from './internal/DepositProcessing';
import { useDepositEnvironment } from './internal/DepositEnvironment';
import {
  depositInputBaseUnits,
  formatUsdcBalance,
  isCompleteDepositAmount,
  meetsDepositMinimum,
  sanitizeDepositInput,
  toDepositAmount,
} from './internal/depositAmount';
import { useDepositFlow } from './internal/useDepositFlow';
import { useUsdcBalance, type UsdcBalance } from './internal/useUsdcBalance';
import { PredictDepositScreenTestIds } from './PredictDepositScreen.testIds';

/** How often a new deposit is read again while the venue prepares its
 * address. */
const ADDRESS_POLL_INTERVAL_MS = 2_000;

/**
 * The legacy deposit's stages: amount entry with the keypad open, then the
 * review with Add funds, then the processing hand-off.
 */
type DepositStage =
  | { kind: 'amount' }
  | { kind: 'review' }
  | { kind: 'processing'; amount: PredictAmount };

type DepositNotice = 'plan_mismatch' | 'rejected' | 'failed' | 'mismatch';

interface InProgressSheetState {
  deposit: PredictDepositOperation | null;
  isCancelling: boolean;
  cancelFailed: boolean;
}

const NOTICE_COPY: Record<DepositNotice, string> = {
  plan_mismatch: 'predict_next.deposit.plan_mismatch',
  rejected: 'predict_next.deposit.rejected',
  failed: 'predict_next.deposit.failed',
  mismatch: 'predict_next.deposit.transfer_mismatch',
};

const noticeFor = (outcome: DepositOutcome): DepositNotice | undefined => {
  switch (outcome.kind) {
    case 'plan_mismatch':
      return 'plan_mismatch';
    case 'rejected':
      return 'rejected';
    case 'failed':
      return outcome.error.code === PredictErrorCode.DEPOSIT_TRANSFER_MISMATCH
        ? 'mismatch'
        : 'failed';
    default:
      return undefined;
  }
};

/** Whether the amount is known to be more than the wallet holds. An unknown
 * balance never blocks: the wallet's confirmation still checks it. */
const exceedsBalance = (input: string, balance: UsdcBalance): boolean => {
  const baseUnits = depositInputBaseUnits(input);
  return (
    balance.status === 'ready' &&
    baseUnits !== undefined &&
    baseUnits > balance.baseUnits
  );
};

const BalanceCaption = ({
  balance,
}: {
  balance: UsdcBalance;
}): React.JSX.Element => {
  if (balance.status === 'loading') {
    return (
      <Skeleton
        height={20}
        width={160}
        testID={PredictDepositScreenTestIds.BALANCE_LOADING}
      />
    );
  }
  return (
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextAlternative}
      testID={PredictDepositScreenTestIds.BALANCE}
    >
      {balance.status === 'ready'
        ? strings('predict_next.deposit.available', {
            amount: formatUsdcBalance(balance.baseUnits),
          })
        : strings('predict_next.deposit.balance_unavailable')}
    </Text>
  );
};

/**
 * The Kalshi deposit, in the legacy Predict deposit's layout and copy: the
 * amount with the Funding Wallet's USDC balance under it, Pay with fixed to
 * USDC on the deposit chain, the keypad, then Add funds. Add funds prepares
 * the deposit, checks its Funding Plan and sends the USDC transfer through
 * the wallet's standard confirmation (`funding/deposit`).
 */
export const PredictDepositScreen = (): React.JSX.Element => {
  const navigation =
    useNavigation<NativeStackNavigationProp<PredictNextStackParamList>>();
  const route =
    useRoute<RouteProp<PredictNextStackParamList, 'PredictNextDeposit'>>();
  const { venueId } = route.params;
  const tw = useTailwind();
  const isGlassHeader = useSelector(selectPredictBrandRefreshEnabled) === true;
  const fundingWallet = useSelector(selectEvmAddress) as PredictHex | undefined;
  const environmentResolution = useDepositEnvironment(venueId);
  const environment =
    environmentResolution.status === 'ready'
      ? environmentResolution.environment
      : undefined;
  const isEnvironmentReady = environmentResolution.status === 'ready';
  const isSimulated = environment?.transferMode === 'simulated';
  const isOffline = useNetworkTier() === 'NONE';
  const balance = useUsdcBalance({
    network: environment?.network,
    address: fundingWallet,
    enabled:
      environmentResolution.status !== 'unavailable' &&
      !isSimulated &&
      !isOffline,
  });
  const flow = useDepositFlow({
    venueId,
    environment,
    fundingWallet,
    addressPollIntervalMs: ADDRESS_POLL_INTERVAL_MS,
  });

  const [input, setInput] = useState('');
  const [stage, setStage] = useState<DepositStage>({ kind: 'amount' });
  const [notice, setNotice] = useState<DepositNotice>();
  const [sheet, setSheet] = useState<InProgressSheetState>();

  const isComplete = isCompleteDepositAmount(input);
  const isBelowMinimum = isComplete && !meetsDepositMinimum(input);
  const isShort =
    isEnvironmentReady && !isSimulated && exceedsBalance(input, balance);
  const canContinue =
    isEnvironmentReady &&
    Boolean(fundingWallet) &&
    meetsDepositMinimum(input) &&
    !isShort;

  const editAmount = useCallback((next: string) => {
    setInput(sanitizeDepositInput(next));
    setNotice(undefined);
  }, []);

  const handleOutcome = useCallback((outcome: DepositOutcome | undefined) => {
    if (!outcome) {
      return;
    }
    if (outcome.kind === 'submitted') {
      setStage({ kind: 'processing', amount: outcome.deposit.amount });
      return;
    }
    if (outcome.kind === 'in_progress') {
      setSheet({
        deposit: outcome.deposit,
        isCancelling: false,
        cancelFailed: false,
      });
      return;
    }
    if (outcome.kind === 'already_resolved') {
      if (outcome.deposit.status === 'failed') {
        setNotice('failed');
      }
      return;
    }
    setNotice(noticeFor(outcome));
  }, []);

  const addFunds = useCallback(async () => {
    setNotice(undefined);
    handleOutcome(await flow.start(toDepositAmount(input)));
  }, [flow, handleOutcome, input]);

  const continueOpenDeposit = useCallback(
    async (deposit: PredictDepositOperation) => {
      // The wallet's confirmation opens next; the sheet must not cover it.
      setSheet(undefined);
      setNotice(undefined);
      handleOutcome(await flow.payOpenDeposit(deposit));
    },
    [flow, handleOutcome],
  );

  const cancelOpenDeposit = useCallback(
    async (deposit: PredictDepositOperation) => {
      setSheet((current) =>
        current
          ? { ...current, isCancelling: true, cancelFailed: false }
          : current,
      );
      const cancelled = await flow.cancelOpenDeposit(deposit);
      setSheet((current) => {
        if (!current || cancelled) {
          return undefined;
        }
        return { ...current, isCancelling: false, cancelFailed: true };
      });
    },
    [flow],
  );

  const closeSheet = useCallback(() => setSheet(undefined), []);
  const close = useCallback(() => navigation.goBack(), [navigation]);

  const isAmountStage = stage.kind === 'amount';
  let alertText: string | undefined;
  if (environmentResolution.status === 'unavailable') {
    alertText =
      environmentResolution.reason === 'error'
        ? strings('predict_next.deposit.unavailable_error')
        : strings('predict_next.deposit.unavailable');
  } else if (isShort && environment) {
    alertText = strings('predict_next.deposit.not_enough_usdc', {
      network: environment.network.networkName,
    });
  } else if (isBelowMinimum) {
    alertText = strings('predict_next.deposit.minimum');
  }
  const noticeText = notice ? strings(NOTICE_COPY[notice]) : undefined;

  // VoiceOver ignores RN live regions on iOS, so announce errors explicitly
  // only when the rendered message appears or changes.
  useEffect(() => {
    if (alertText) {
      AccessibilityInfo.announceForAccessibility(alertText);
    }
  }, [alertText]);

  useEffect(() => {
    if (noticeText) {
      AccessibilityInfo.announceForAccessibility(noticeText);
    }
  }, [noticeText]);

  let caption: React.JSX.Element;
  if (alertText) {
    caption = (
      <Box className="items-center gap-1">
        <Text
          color={TextColor.ErrorDefault}
          className="text-center"
          accessibilityRole="alert"
          testID={PredictDepositScreenTestIds.ALERT}
        >
          {alertText}
        </Text>
        {environmentResolution.status === 'unavailable' &&
        environmentResolution.reason === 'error' ? (
          <Button
            variant={ButtonVariant.Tertiary}
            onPress={environmentResolution.retry}
            testID={PredictDepositScreenTestIds.RETRY}
          >
            {strings('predict_next.deposit.retry')}
          </Button>
        ) : null}
      </Box>
    );
  } else if (environmentResolution.status === 'loading') {
    caption = (
      <Skeleton
        height={20}
        width={160}
        testID={PredictDepositScreenTestIds.BALANCE_LOADING}
      />
    );
  } else if (isSimulated) {
    caption = (
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        testID={PredictDepositScreenTestIds.SIMULATED_CAPTION}
      >
        {strings('predict_next.deposit.simulated_sandbox')}
      </Text>
    );
  } else {
    caption = <BalanceCaption balance={balance} />;
  }

  const sheetHasSubmittedTransfer = sheet
    ? flow.hasSubmittedTransfer(sheet.deposit)
    : false;
  const canContinueSheet =
    isEnvironmentReady || (Boolean(fundingWallet) && sheetHasSubmittedTransfer);

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={PredictDepositScreenTestIds.CONTAINER}
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        includesTopInset
        title={strings('predict_next.deposit.title')}
        onBack={close}
        backButtonProps={{ testID: PredictDepositScreenTestIds.BACK }}
      />
      {stage.kind === 'processing' ? (
        <DepositProcessing amount={stage.amount} onDone={close} />
      ) : (
        <Box className="flex-1 justify-between">
          <Box className="flex-1 items-center justify-center gap-3.5">
            <PredictAmountDisplay
              amount={input}
              isActive={isAmountStage}
              isDisabled={flow.isWorking}
              onAmountPress={() => setStage({ kind: 'amount' })}
              accessibilityLabel={strings('predict_next.deposit.amount')}
              testID={PredictDepositScreenTestIds.AMOUNT}
            />
            <Box className="min-h-[24px] items-center px-4">{caption}</Box>
          </Box>
          <Box className="gap-4 px-4 pb-4">
            {environment ? (
              <DepositPayWithRow network={environment.network} />
            ) : null}
            {noticeText ? (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.ErrorDefault}
                className="text-center"
                accessibilityRole="alert"
                testID={PredictDepositScreenTestIds.NOTICE}
              >
                {noticeText}
              </Text>
            ) : null}
            {isAmountStage ? (
              <>
                <Box className="-mx-4">
                  <PredictKeypad
                    onKeyPress={(key) => editAmount(`${input}${key}`)}
                    onDelete={() => editAmount(input.slice(0, -1))}
                    testID={PredictDepositScreenTestIds.KEYPAD}
                  />
                </Box>
                <Button
                  variant={ButtonVariant.Primary}
                  size={ButtonSize.Lg}
                  isFullWidth
                  isDisabled={!canContinue}
                  onPress={() => setStage({ kind: 'review' })}
                  testID={PredictDepositScreenTestIds.CONTINUE}
                >
                  {strings('predict_next.deposit.continue')}
                </Button>
              </>
            ) : (
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                isFullWidth
                isDisabled={!canContinue || flow.isWorking}
                isLoading={flow.isWorking}
                onPress={addFunds}
                testID={PredictDepositScreenTestIds.ADD_FUNDS}
              >
                {strings('predict_next.deposit.add_funds')}
              </Button>
            )}
          </Box>
        </Box>
      )}
      {sheet ? (
        <DepositInProgressSheet
          deposit={sheet.deposit}
          hasSubmittedTransfer={sheetHasSubmittedTransfer}
          environmentResolution={environmentResolution}
          canContinue={canContinueSheet}
          canCancel={Boolean(fundingWallet)}
          isCancelling={sheet.isCancelling}
          cancelFailed={sheet.cancelFailed}
          onContinue={continueOpenDeposit}
          onCancel={cancelOpenDeposit}
          onClose={closeSheet}
        />
      ) : null}
    </SafeAreaView>
  );
};
