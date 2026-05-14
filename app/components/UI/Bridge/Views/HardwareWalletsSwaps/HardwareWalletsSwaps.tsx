import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonBaseSize,
  ButtonIcon,
  ButtonIconSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import Rive, { Alignment, Fit, RiveRef } from 'rive-react-native';

import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import genericHardwareWalletRiveFile from '../../../../../animations/generic_hardware_wallet.riv';
import {
  resetHardwareWalletsSwaps,
  selectHardwareWalletsSwaps,
  updateHardwareWalletsSwaps,
} from '../../../../../core/redux/slices/bridge';
import {
  HardwareWalletsSwapsState,
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsStep,
  HardwareWalletsSwapsStepKind,
} from './HardwareWalletsSwaps.state';
import { HardwareWalletsSwapsSelectorsIDs } from './HardwareWalletsSwaps.testIds';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSubmitBridgeTx from '../../../../../util/bridge/hooks/useSubmitBridgeTx';
import {
  getBridgeSubmissionCache,
  clearBridgeSubmissionCache,
} from '../../hooks/bridgeSubmissionCache';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName as ToastIconName } from '../../../../../component-library/components/Icons/Icon';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { useHwBatchSignTracker } from '../../hooks/useHwBatchSignTracker';

import { useHwConnectionMonitoring } from './hooks/useHwConnectionMonitoring';
import { useHwQrState } from './hooks/useHwQrState';
import { useHwConfirmationMonitoring } from './hooks/useHwConfirmationMonitoring';

const HARDWARE_WALLET_RIVE_ARTBOARD = 'Generic';
const HARDWARE_WALLET_RIVE_STATE_MACHINE = 'wallet_states';
const styles = StyleSheet.create({
  riveAnimation: {
    height: 112,
    width: 112,
  },
});

const HardwareWalletRiveTrigger = {
  Reset: 'reset',
  WalletLocked: 'wallet_locked',
  WalletDisconnected: 'wallet_disconnected',
  Error: 'error',
  Found: 'found',
  NotFound: 'not_found',
} as const;

function getStepTitle(step: HardwareWalletsSwapsStep) {
  if (step.kind === HardwareWalletsSwapsStepKind.Approval) {
    return step.status === 'signed'
      ? strings('bridge.hardware_wallet_progress.approved_token')
      : strings('bridge.hardware_wallet_progress.approve_token');
  }

  return step.status === 'signed'
    ? strings('bridge.hardware_wallet_progress.sent_token')
    : strings('bridge.hardware_wallet_progress.send_token');
}

function getStepDescription(step: HardwareWalletsSwapsStep) {
  if (step.status === 'rejected') {
    return strings('bridge.hardware_wallet_progress.rejected');
  }

  if (step.kind === HardwareWalletsSwapsStepKind.Approval) {
    return (
      step.address ??
      strings('bridge.hardware_wallet_progress.spender')
    );
  }

  return (
    step.address ??
    strings('bridge.hardware_wallet_progress.recipient')
  );
}

interface StepIconResult {
  name: typeof IconName.Check | typeof IconName.Close | undefined;
  color:
    | typeof IconColor.SuccessDefault
    | typeof IconColor.ErrorDefault
    | undefined;
  label: string | undefined;
  isSigning: boolean;
}

function getStepIcon(
  step: HardwareWalletsSwapsStep,
  index: number,
): StepIconResult {
  if (step.status === 'signed') {
    return {
      name: IconName.Check,
      color: IconColor.SuccessDefault,
      label: undefined,
      isSigning: false,
    };
  }

  if (step.status === 'rejected') {
    return {
      name: IconName.Close,
      color: IconColor.ErrorDefault,
      label: undefined,
      isSigning: false,
    };
  }

  if (step.status === 'signing') {
    return {
      name: undefined,
      color: undefined,
      label: undefined,
      isSigning: true,
    };
  }

  return {
    name: undefined,
    color: undefined,
    label: `${index + 1}`,
    isSigning: false,
  };
}

function getHardwareWalletRiveTrigger(progress: HardwareWalletsSwapsState) {
  if (progress.status === HardwareWalletsSwapsStatus.Submitted) {
    return HardwareWalletRiveTrigger.Found;
  }

  if (progress.status === HardwareWalletsSwapsStatus.Rejected) {
    return HardwareWalletRiveTrigger.Error;
  }

  if (progress.status === HardwareWalletsSwapsStatus.Failed) {
    return HardwareWalletRiveTrigger.Error;
  }

  if (progress.status === HardwareWalletsSwapsStatus.Disconnected) {
    return HardwareWalletRiveTrigger.WalletDisconnected;
  }

  if (progress.status === HardwareWalletsSwapsStatus.Cancelled) {
    return HardwareWalletRiveTrigger.WalletDisconnected;
  }

  if (progress.status === HardwareWalletsSwapsStatus.Idle) {
    return HardwareWalletRiveTrigger.NotFound;
  }

  const activeStep = progress.steps[progress.currentStep - 1];
  return activeStep?.status === 'signing'
    ? HardwareWalletRiveTrigger.WalletLocked
    : HardwareWalletRiveTrigger.Reset;
}

interface StepRowProps {
  step: HardwareWalletsSwapsStep;
  index: number;
}

function StepRow({ step, index }: StepRowProps) {
  const icon = getStepIcon(step, index);
  const titleColor =
    step.status === 'rejected' ? TextColor.ErrorDefault : TextColor.TextDefault;
  const { colors } = useTheme();

  return (
    <Box
      testID={`${HardwareWalletsSwapsSelectorsIDs.STEP_ROW}-${index}`}
      flexDirection={BoxFlexDirection.Row}
      gap={3}
      alignItems={BoxAlignItems.Start}
      twClassName="w-full"
    >
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        backgroundColor={BoxBackgroundColor.BackgroundMuted}
        twClassName="h-8 w-8 rounded-full"
      >
        {icon.isSigning ? (
          <ActivityIndicator size="small" color={colors.primary.default} />
        ) : icon.name ? (
          <Icon name={icon.name} color={icon.color} size={IconSize.Md} />
        ) : (
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {icon.label}
          </Text>
        )}
      </Box>
      <Box twClassName="flex-1">
        <Text
          variant={TextVariant.BodyMd}
          color={titleColor}
          fontWeight={FontWeight.Medium}
        >
          {getStepTitle(step)}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {getStepDescription(step)}
        </Text>
      </Box>
    </Box>
  );
}

export function HardwareWalletsSwaps() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const { colors } = useTheme();
  const riveRef = useRef<RiveRef>(null);
  const [isRivePlaying, setIsRivePlaying] = useState(false);
  const progress = useSelector(selectHardwareWalletsSwaps);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const walletAddress = useSelector(selectSourceWalletAddress);
  const { cancelCurrentBatch, confirmationTxId } = useHwBatchSignTracker({
    fromAddress: walletAddress ?? undefined,
    isEnabled: Boolean(walletAddress),
  });

  useHwConnectionMonitoring({
    isEnabled: Boolean(walletAddress),
    currentStatus: progress.status,
    hasActiveSigning: Boolean(confirmationTxId),
  });

  useHwQrState({
    isEnabled: Boolean(walletAddress),
    currentStatus: progress.status,
  });

  useHwConfirmationMonitoring({
    isEnabled: Boolean(walletAddress),
    currentStatus: progress.status,
    confirmationTxId,
    isDeviceDisconnected:
      progress.status === HardwareWalletsSwapsStatus.Disconnected,
  });

  const { submitBridgeTx } = useSubmitBridgeTx();
  const toastRef = useContext(ToastContext)?.toastRef;
  const hasAutoNavigatedRef = useRef(false);
  const hasInitialSubmissionRef = useRef(false);
  const submissionGenerationRef = useRef(0);

  useEffect(() => {
    console.log('[HW-Swaps] progress state changed:', JSON.stringify({
      status: progress.status,
      currentStep: progress.currentStep,
      totalSteps: progress.totalSteps,
      steps: progress.steps.map(s => ({ kind: s.kind, status: s.status, address: s.address })),
      disconnectedStep: progress.disconnectedStep,
    }));
  }, [progress]);

  const animationTrigger = useMemo(
    () => getHardwareWalletRiveTrigger(progress),
    [progress],
  );

  useEffect(() => {
    if (!isRivePlaying) {
      return;
    }

    riveRef.current?.fireState(
      HARDWARE_WALLET_RIVE_STATE_MACHINE,
      animationTrigger,
    );
  }, [animationTrigger, isRivePlaying]);

  useEffect(() => {
    if (progress.status !== HardwareWalletsSwapsStatus.Submitted) return;
    if (hasAutoNavigatedRef.current) return;

    console.log('[HW-Swaps] Status=Submitted — scheduling auto-navigate to transactions view');
    hasAutoNavigatedRef.current = true;

    const timer = setTimeout(() => {
      console.log('[HW-Swaps] Auto-navigating to transactions view after submission');
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: ToastIconName.Check,
        hasNoTimeout: false,
        labelOptions: [
          {
            label: strings('bridge.hardware_wallet_progress.submitted_title'),
          },
        ],
      });
      dispatch(resetHardwareWalletsSwaps());
      navigation.navigate(Routes.TRANSACTIONS_VIEW as never);
    }, 1000);

    return () => clearTimeout(timer);
  }, [progress.status, navigation, dispatch, toastRef]);

  const submitWithDeviceReady = useCallback(async () => {
    console.log('[HW-Swaps] submitWithDeviceReady called');
    const cachedParams = getBridgeSubmissionCache();
    if (!cachedParams) {
      console.log('[HW-Swaps] No cached params found — dispatching TRANSACTION_FAILED');
      dispatch(updateHardwareWalletsSwaps({ type: 'TRANSACTION_FAILED' }));
      return;
    }
    if (!walletAddress) {
      console.log('[HW-Swaps] No wallet address — dispatching TRANSACTION_FAILED');
      dispatch(updateHardwareWalletsSwaps({ type: 'TRANSACTION_FAILED' }));
      return;
    }
    console.log('[HW-Swaps] Cached params found, calling submitBridgeTx...', {
      walletAddress,
    });
    const myGeneration = submissionGenerationRef.current;
    try {
      await submitBridgeTx(cachedParams);
      console.log('[HW-Swaps] submitBridgeTx completed successfully');
    } catch (error) {
      if (submissionGenerationRef.current !== myGeneration) {
        console.log('[HW-Swaps] Stale submission — ignoring error from cancelled batch');
        return;
      }
      Logger.error(
        error as Error,
        'HardwareWalletsSwaps: submission failed',
      );
      console.log('[HW-Swaps] submitBridgeTx threw error:', error);
      const currentProgress = progressRef.current;
      const isTerminal =
        currentProgress.status === HardwareWalletsSwapsStatus.Rejected ||
        currentProgress.status === HardwareWalletsSwapsStatus.Submitted ||
        currentProgress.status === HardwareWalletsSwapsStatus.Failed;
      console.log('[HW-Swaps] Error caught — isTerminal?', isTerminal, 'current status:', currentProgress.status);
      if (!isTerminal) {
        console.log('[HW-Swaps] Dispatching TRANSACTION_FAILED after error');
        dispatch(updateHardwareWalletsSwaps({ type: 'TRANSACTION_FAILED' }));
      }
    }
  }, [dispatch, submitBridgeTx, walletAddress]);

  useEffect(() => {
    if (progress.status !== HardwareWalletsSwapsStatus.Waiting) return;
    if (hasInitialSubmissionRef.current) {
      console.log('[HW-Swaps] Waiting status detected but initial submission already triggered, skipping');
      return;
    }
    if (!getBridgeSubmissionCache()) {
      console.log('[HW-Swaps] Waiting status but no cache — dispatching TRANSACTION_FAILED');
      dispatch(updateHardwareWalletsSwaps({ type: 'TRANSACTION_FAILED' }));
      return;
    }

    console.log('[HW-Swaps] Waiting status detected — triggering initial submission (currentStep:', progress.currentStep, ')');
    hasInitialSubmissionRef.current = true;
    submitWithDeviceReady();
  }, [progress.currentStep, progress.status, dispatch, submitWithDeviceReady]);

  const isSigning = useMemo(() => {
    if (
      progress.status !== HardwareWalletsSwapsStatus.Waiting &&
      progress.status !== HardwareWalletsSwapsStatus.Submitted
    ) {
      return false;
    }
    const activeStep = progress.steps[progress.currentStep - 1];
    return activeStep?.status === 'signing';
  }, [progress.currentStep, progress.status, progress.steps]);

  const signingTitleParts = useMemo(() => {
    const full = strings('bridge.hardware_wallet_progress.confirm_title', {
      current: '',
      total: '',
    });
    const idx = full.indexOf(' (/');
    if (idx >= 0) {
      return {
        prefix: full.slice(0, idx),
        suffix: '',
      };
    }
    return { prefix: full, suffix: '' };
  }, []);

  const title = useMemo(() => {
    if (isSigning) {
      return null;
    }

    if (progress.status === HardwareWalletsSwapsStatus.Submitted) {
      return strings('bridge.hardware_wallet_progress.submitted_title');
    }

    if (progress.status === HardwareWalletsSwapsStatus.Rejected) {
      return strings('bridge.hardware_wallet_progress.rejected_title');
    }

    if (progress.status === HardwareWalletsSwapsStatus.Failed) {
      return strings('bridge.hardware_wallet_progress.failed_title');
    }

    if (progress.status === HardwareWalletsSwapsStatus.Disconnected) {
      return strings('bridge.hardware_wallet_progress.disconnected_title');
    }

    return strings('bridge.hardware_wallet_progress.confirm_title', {
      current: progress.currentStep || 1,
      total: progress.totalSteps || 1,
    });
  }, [isSigning, progress.currentStep, progress.status, progress.totalSteps]);

  const handleCancel = useCallback(() => {
    console.log('[HW-Swaps] handleCancel — clearing cache and navigating back to bridge view');
    cancelCurrentBatch();
    clearBridgeSubmissionCache();
    dispatch(resetHardwareWalletsSwaps());
    navigation.navigate(Routes.BRIDGE.BRIDGE_VIEW as never);
  }, [dispatch, navigation, cancelCurrentBatch]);

  const handleTryAgain = useCallback(async () => {
    console.log('[HW-Swaps] handleTryAgain — cancelling current batch and retrying submission');
    submissionGenerationRef.current += 1;
    await cancelCurrentBatch();
    dispatch(updateHardwareWalletsSwaps({ type: 'RETRY' }));
    await submitWithDeviceReady();
  }, [dispatch, cancelCurrentBatch, submitWithDeviceReady]);

  const handleReconnect = useCallback(async () => {
    console.log('[HW-Swaps] handleReconnect — cancelling stale batch and retrying submission');
    submissionGenerationRef.current += 1;
    await cancelCurrentBatch();
    dispatch(updateHardwareWalletsSwaps({ type: 'RETRY' }));
    await submitWithDeviceReady();
  }, [dispatch, cancelCurrentBatch, submitWithDeviceReady]);

  const handleDone = useCallback(() => {
    console.log('[HW-Swaps] handleDone — clearing cache and navigating to transactions view');
    clearBridgeSubmissionCache();
    dispatch(resetHardwareWalletsSwaps());
    navigation.navigate(Routes.TRANSACTIONS_VIEW as never);
  }, [dispatch, navigation]);

  const showRejectedActions =
    progress.status === HardwareWalletsSwapsStatus.Rejected ||
    progress.status === HardwareWalletsSwapsStatus.Failed;
  const showReconnect =
    progress.status === HardwareWalletsSwapsStatus.Disconnected;
  const showCancel = progress.status !== HardwareWalletsSwapsStatus.Submitted;
  const showDone = progress.status === HardwareWalletsSwapsStatus.Submitted;

  return (
    <SafeAreaView
      testID={HardwareWalletsSwapsSelectorsIDs.CONTAINER}
      style={tw`flex-1 bg-default`}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        alignItems={BoxAlignItems.Center}
        padding={4}
      >
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Md}
          onPress={handleCancel}
        />
        <Box twClassName="h-10 w-10" />
      </Box>

      <Box paddingHorizontal={4} twClassName="flex-1">
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="h-32"
        >
          <Rive
            ref={riveRef}
            testID={HardwareWalletsSwapsSelectorsIDs.RIVE_ANIMATION}
            source={genericHardwareWalletRiveFile}
            artboardName={HARDWARE_WALLET_RIVE_ARTBOARD}
            stateMachineName={HARDWARE_WALLET_RIVE_STATE_MACHINE}
            autoplay
            fit={Fit.Contain}
            alignment={Alignment.Center}
            style={styles.riveAnimation}
            onPlay={() => setIsRivePlaying(true)}
            onError={(riveError) => {
              Logger.error(
                new Error(riveError.message),
                `HardwareWalletsSwaps: Rive error (${riveError.type})`,
              );
            }}
          />
        </Box>

        {isSigning ? (
          <Box
            testID={HardwareWalletsSwapsSelectorsIDs.TITLE}
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
            twClassName="mb-8"
          >
            <Text variant={TextVariant.HeadingLg}>
              {signingTitleParts.prefix} (
            </Text>
            <ActivityIndicator size="small" color={colors.primary.default} />
            <Text variant={TextVariant.HeadingLg}>
              /{progress.totalSteps || 1})
            </Text>
          </Box>
        ) : (
          <Text
            testID={HardwareWalletsSwapsSelectorsIDs.TITLE}
            variant={TextVariant.HeadingLg}
            twClassName="mb-8"
          >
            {title}
          </Text>
        )}

        <Box gap={5}>
          {progress.steps.map((step, index) => (
            <StepRow
              // The order is fixed by the state machine for the lifetime of a flow.
              key={`${step.kind}-${index}`}
              step={step}
              index={index}
            />
          ))}
        </Box>
      </Box>

      <Box gap={4} padding={4}>
        {showRejectedActions ? (
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonBaseSize.Lg}
            isFullWidth
            testID={HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON}
            onPress={handleTryAgain}
          >
            {strings('hardware_wallet.common.try_again')}
          </Button>
        ) : null}
        {showReconnect ? (
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonBaseSize.Lg}
            isFullWidth
            testID={HardwareWalletsSwapsSelectorsIDs.RECONNECT_BUTTON}
            onPress={handleReconnect}
          >
            {strings('bridge.hardware_wallet_progress.reconnect')}
          </Button>
        ) : null}
        {showDone ? (
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonBaseSize.Lg}
            isFullWidth
            testID={HardwareWalletsSwapsSelectorsIDs.DONE_BUTTON}
            onPress={handleDone}
          >
            {strings('bridge.hardware_wallet_progress.done')}
          </Button>
        ) : null}
        {showCancel ? (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonBaseSize.Lg}
            isFullWidth
            testID={HardwareWalletsSwapsSelectorsIDs.CANCEL_BUTTON}
            onPress={handleCancel}
          >
            {strings('hardware_wallet.common.cancel')}
          </Button>
        ) : null}
      </Box>
    </SafeAreaView>
  );
}
