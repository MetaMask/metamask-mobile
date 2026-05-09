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
import { StyleSheet } from 'react-native';
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
import { HwSwapsDebugOverlay } from './debug/HwSwapsDebugOverlay';
import { useHwSwapsDebug } from './debug/HwSwapsDebugContext';

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
    return strings('bridge.hardware_wallet_progress.spender');
  }

  return strings('bridge.hardware_wallet_progress.recipient');
}

function getStepIcon(step: HardwareWalletsSwapsStep, index: number) {
  if (step.status === 'signed') {
    return {
      name: IconName.Check,
      color: IconColor.SuccessDefault,
      label: undefined,
    };
  }

  if (step.status === 'rejected') {
    return {
      name: IconName.Close,
      color: IconColor.ErrorDefault,
      label: undefined,
    };
  }

  if (step.status === 'signing') {
    return {
      name: IconName.Loading,
      color: IconColor.PrimaryDefault,
      label: undefined,
    };
  }

  return {
    name: undefined,
    color: undefined,
    label: `${index + 1}`,
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
        {icon.name ? (
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
  const riveRef = useRef<RiveRef>(null);
  const [isRivePlaying, setIsRivePlaying] = useState(false);
  const reduxProgress = useSelector(selectHardwareWalletsSwaps);
  const { debugState } = useHwSwapsDebug();
  const progress = debugState ?? reduxProgress;
  const walletAddress = useSelector(selectSourceWalletAddress);
  const { cancelCurrentBatch } = useHwBatchSignTracker({
    fromAddress: walletAddress ?? undefined,
    isEnabled: Boolean(walletAddress),
  });
  const { submitBridgeTx } = useSubmitBridgeTx();
  const toastRef = useContext(ToastContext)?.toastRef;
  const hasAutoNavigatedRef = useRef(false);

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

    hasAutoNavigatedRef.current = true;

    const timer = setTimeout(() => {
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

  const title = useMemo(() => {
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
  }, [progress.currentStep, progress.status, progress.totalSteps]);

  const handleCancel = useCallback(() => {
    clearBridgeSubmissionCache();
    dispatch(resetHardwareWalletsSwaps());
    navigation.navigate(Routes.BRIDGE.BRIDGE_VIEW as never);
  }, [dispatch, navigation]);

  const handleTryAgain = useCallback(async () => {
    cancelCurrentBatch();
    dispatch(updateHardwareWalletsSwaps({ type: 'RETRY' }));
    const cachedParams = getBridgeSubmissionCache();
    if (cachedParams) {
      try {
        await submitBridgeTx(cachedParams);
      } catch {
        // The tracker in useBridgeConfirm dispatches REJECTED/TRANSACTION_FAILED
      }
    }
  }, [dispatch, submitBridgeTx, cancelCurrentBatch]);

  const handleReconnect = useCallback(async () => {
    dispatch(updateHardwareWalletsSwaps({ type: 'RETRY' }));
  }, [dispatch]);

  const handleDone = useCallback(() => {
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
      <HwSwapsDebugOverlay />
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

        <Text
          testID={HardwareWalletsSwapsSelectorsIDs.TITLE}
          variant={TextVariant.HeadingLg}
          twClassName="mb-8"
        >
          {title}
        </Text>

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
