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
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonBaseSize,
  ButtonIcon,
  ButtonIconSize,
  ButtonVariant,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { StyleSheet } from 'react-native';
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
  HardwareWalletsSwapsEventType,
  HardwareWalletsSwapsStepStatus,
} from './HardwareWalletsSwaps.state';
import { HardwareWalletsSwapsSelectorsIDs } from './HardwareWalletsSwaps.testIds';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSubmitBridgeTx from '../../../../../util/bridge/hooks/useSubmitBridgeTx';
import {
  getBridgeSubmissionCache,
  clearBridgeSubmissionCache,
  isBridgeSubmissionCacheStale,
} from '../../hooks/bridgeSubmissionCache';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName as ToastIconName } from '../../../../../component-library/components/Icons/Icon';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { useHwBatchSignTracker } from '../../hooks/useHwBatchSignTracker';
import { useHardwareWallet } from '../../../../../core/HardwareWallet';

import { useHwConnectionMonitoring } from './hooks/useHwConnectionMonitoring';
import { useHwQrState } from './hooks/useHwQrState';
import { ConnectionStatus } from '@metamask/hw-wallet-sdk';
import { StepRow } from './StepRow';

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
  return activeStep?.status === HardwareWalletsSwapsStepStatus.Signing
    ? HardwareWalletRiveTrigger.WalletLocked
    : HardwareWalletRiveTrigger.Reset;
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
  useEffect(() => {
    progressRef.current = progress;
  });
  const walletAddress = useSelector(selectSourceWalletAddress);
  const submissionGenerationRef = useRef(0);
  const { cancelCurrentBatch, confirmationTxId } = useHwBatchSignTracker({
    fromAddress: walletAddress ?? undefined,
    isEnabled: Boolean(walletAddress),
  });

  const { resetHandledError } = useHwConnectionMonitoring({
    isEnabled: Boolean(walletAddress),
    currentStatus: progress.status,
    hasActiveSigning: Boolean(confirmationTxId),
  });

  useHwQrState({
    isEnabled: Boolean(walletAddress),
    currentStatus: progress.status,
  });

  const { submitBridgeTx } = useSubmitBridgeTx();
  const { connectionState } = useHardwareWallet();
  const toastRef = useContext(ToastContext)?.toastRef;
  const hasAutoNavigatedRef = useRef(false);
  const hasInitialSubmissionRef = useRef(false);
  const retryingMutexRef = useRef(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [publishComplete, setPublishComplete] = useState(false);

  const navigateToTransactions = useCallback(() => {
    if (hasAutoNavigatedRef.current) return;
    hasAutoNavigatedRef.current = true;
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
    navigation.navigate(Routes.TRANSACTIONS_VIEW);
  }, [dispatch, navigation, toastRef]);

  useEffect(() => {
    if (!isRivePlaying) {
      return;
    }

    const trigger = getHardwareWalletRiveTrigger(progress);
    riveRef.current?.fireState(HARDWARE_WALLET_RIVE_STATE_MACHINE, trigger);
  }, [progress, isRivePlaying]);

  useEffect(() => {
    if (progress.status !== HardwareWalletsSwapsStatus.Submitted) return;
    if (hasAutoNavigatedRef.current) return;
    if (!hasInitialSubmissionRef.current) return;
    if (!publishComplete) return;
    navigateToTransactions();
  }, [progress.status, publishComplete, navigateToTransactions]);

  const submitWithDeviceReady = useCallback(async () => {
    const cachedParams = getBridgeSubmissionCache();
    if (!cachedParams) {
      dispatch(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.TransactionFailed,
        }),
      );
      return;
    }
    if (isBridgeSubmissionCacheStale()) {
      clearBridgeSubmissionCache();
      dispatch(resetHardwareWalletsSwaps());
      navigation.navigate(Routes.BRIDGE.BRIDGE_VIEW);
      return;
    }
    if (!walletAddress) {
      dispatch(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.TransactionFailed,
        }),
      );
      return;
    }
    const myGeneration = submissionGenerationRef.current;
    setPublishComplete(false);
    try {
      await submitBridgeTx(cachedParams);
      setPublishComplete(true);
    } catch (error) {
      setPublishComplete(true);
      if (submissionGenerationRef.current !== myGeneration) {
        return;
      }
      Logger.error(error as Error, 'HardwareWalletsSwaps: submission failed');
      const currentProgress = progressRef.current;
      if (
        currentProgress.status === HardwareWalletsSwapsStatus.Waiting ||
        currentProgress.status === HardwareWalletsSwapsStatus.Submitted
      ) {
        dispatch(
          updateHardwareWalletsSwaps({
            type: HardwareWalletsSwapsEventType.TransactionFailed,
          }),
        );
      }
    }
  }, [dispatch, submitBridgeTx, walletAddress, navigation]);

  useEffect(() => {
    if (progress.status !== HardwareWalletsSwapsStatus.Waiting) return;
    if (hasInitialSubmissionRef.current) return;
    if (hasAutoNavigatedRef.current) return;
    if (!getBridgeSubmissionCache()) {
      dispatch(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.TransactionFailed,
        }),
      );
      return;
    }

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
    return activeStep?.status === HardwareWalletsSwapsStepStatus.Signing;
  }, [progress.currentStep, progress.status, progress.steps]);

  const signingTitle = useMemo(() => {
    const totalSteps = progress.totalSteps || 1;
    return strings('bridge.hardware_wallet_progress.confirm_title', {
      current: progress.currentStep || 1,
      total: totalSteps,
    });
  }, [progress.currentStep, progress.totalSteps]);

  const title = useMemo(() => {
    if (isSigning) return null;
    switch (progress.status) {
      case HardwareWalletsSwapsStatus.Submitted:
        return strings('bridge.hardware_wallet_progress.submitted_title');
      case HardwareWalletsSwapsStatus.Rejected:
        return strings('bridge.hardware_wallet_progress.rejected_title');
      case HardwareWalletsSwapsStatus.Failed:
        return strings('bridge.hardware_wallet_progress.failed_title');
      case HardwareWalletsSwapsStatus.Disconnected:
        return strings('bridge.hardware_wallet_progress.disconnected_title');
      case HardwareWalletsSwapsStatus.Waiting:
        return signingTitle;
      default:
        return null;
    }
  }, [isSigning, progress.status, signingTitle]);

  const handleCancel = useCallback(() => {
    cancelCurrentBatch();
    clearBridgeSubmissionCache();
    dispatch(resetHardwareWalletsSwaps());
    navigation.navigate(Routes.BRIDGE.BRIDGE_VIEW);
  }, [dispatch, navigation, cancelCurrentBatch]);

  const retrySubmission = useCallback(
    async (checkConnection: boolean) => {
      if (retryingMutexRef.current) return;
      if (isBridgeSubmissionCacheStale()) {
        clearBridgeSubmissionCache();
        dispatch(resetHardwareWalletsSwaps());
        navigation.navigate(Routes.BRIDGE.BRIDGE_VIEW);
        return;
      }
      retryingMutexRef.current = true;
      setIsRetrying(true);
      hasAutoNavigatedRef.current = false;
      setPublishComplete(false);

      try {
        submissionGenerationRef.current += 1;
        await cancelCurrentBatch();

        if (checkConnection) {
          const canRetry =
            connectionState.status === ConnectionStatus.Connected ||
            connectionState.status === ConnectionStatus.Ready ||
            connectionState.status === ConnectionStatus.AwaitingConfirmation ||
            connectionState.status === ConnectionStatus.ErrorState;

          if (!canRetry) return;
        }

        submissionGenerationRef.current += 1;
        resetHandledError();
        dispatch(
          updateHardwareWalletsSwaps({
            type: HardwareWalletsSwapsEventType.Retry,
          }),
        );
        await submitWithDeviceReady();
      } finally {
        retryingMutexRef.current = false;
        setIsRetrying(false);
      }
    },
    [
      dispatch,
      cancelCurrentBatch,
      submitWithDeviceReady,
      connectionState.status,
      resetHandledError,
      navigation,
    ],
  );

  const handleTryAgain = useCallback(
    () => retrySubmission(false),
    [retrySubmission],
  );

  const handleReconnect = useCallback(
    () => retrySubmission(true),
    [retrySubmission],
  );

  const handleDone = useCallback(() => {
    clearBridgeSubmissionCache();
    dispatch(resetHardwareWalletsSwaps());
    navigation.navigate(Routes.TRANSACTIONS_VIEW);
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
          <Text
            testID={HardwareWalletsSwapsSelectorsIDs.TITLE}
            variant={TextVariant.HeadingLg}
            twClassName="mb-8"
          >
            {signingTitle}
          </Text>
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
            isDisabled={isRetrying}
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
            isDisabled={isRetrying}
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
