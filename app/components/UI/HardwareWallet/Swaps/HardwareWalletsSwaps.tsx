import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
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
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConnectionStatus } from '@metamask/hw-wallet-sdk';

import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import {
  selectHardwareWalletsSwaps,
  selectSourceAmount,
  selectSourceToken,
} from '../../../../core/redux/slices/bridge';
import {
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsStepKind,
  HardwareWalletsSwapsStepStatus,
} from './HardwareWalletsSwaps.state';
import { HardwareWalletsSwapsSelectorsIDs } from './HardwareWalletsSwaps.testIds';
import { selectSourceWalletAddress } from '../../../../selectors/bridge';
import type {
  AppNavigationProp,
  RootStackParamList,
} from '../../../../core/NavigationService/types';
import { useHardwareWallet } from '../../../../core/HardwareWallet';
import { useHwQrState } from './hooks/useHwQrState';
import { StepRow } from './StepRow';
import {
  getCameraScanStep,
  getDisplayScanStep,
  getTotalQrScans,
} from './step-helpers';
import { HwSwapAnimation } from './HwSwapAnimation';
import { resolveFlowStrategy } from './flowStrategy';
import { useHwSwapLifecycle } from './useHwSwapLifecycle';

// Re-export so existing imports from './HardwareWalletsSwaps' keep working.
export type { SubmissionParams } from './flowStrategy';

export function HardwareWalletsSwaps() {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const progress = useSelector(selectHardwareWalletsSwaps);
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const bridgedWalletAddress = useSelector(selectSourceWalletAddress);

  // Resolve the bridge-vs-send fork once — see flowStrategy.ts.
  // Bridge is the default and stays byte-identical to pre-send behavior.
  const { params: routeParams } =
    useRoute<RouteProp<RootStackParamList, 'HardwareWalletsSwaps'>>();
  const strategy = useMemo(
    () =>
      resolveFlowStrategy({
        routeParams,
        bridgedWalletAddress: bridgedWalletAddress ?? undefined,
        sourceAmount: sourceAmount ?? undefined,
        sourceToken: sourceToken ?? undefined,
      }),
    [routeParams, bridgedWalletAddress, sourceAmount, sourceToken],
  );

  const {
    connectionState,
    setForceHideBottomSheet,
    ensureDeviceReady,
    setPendingOperationAddress,
  } = useHardwareWallet();

  // useLayoutEffect: must flush forceHideBottomSheet=false before the
  // initial-submit useEffect calls ensureDeviceReady. With a regular
  // useEffect the state update doesn't propagate in the same batch, so the
  // provider still sees the stale hidden value and the connection bottom
  // sheet never shows on the first mount.
  useLayoutEffect(() => {
    setForceHideBottomSheet?.(
      connectionState.status === ConnectionStatus.AwaitingConfirmation,
    );
  }, [connectionState.status, setForceHideBottomSheet]);

  // Restore the sheet on unmount so other flows see it.
  useEffect(
    () => () => {
      setForceHideBottomSheet?.(false);
    },
    [setForceHideBottomSheet],
  );

  // Set the pending operation address synchronously on mount so the provider
  // can derive the wallet type (Ledger vs QR) BEFORE the initial-submit
  // useEffect calls ensureDeviceReady. Same timing rationale as the
  // forceHideBottomSheet useLayoutEffect above.
  useLayoutEffect(() => {
    if (!strategy.walletAddress) return;
    setPendingOperationAddress?.(strategy.walletAddress);
    return () => {
      setPendingOperationAddress?.(null);
    };
  }, [strategy.walletAddress, setPendingOperationAddress]);

  const { isQrHardwareWallet, showInlineQrSigning, pendingScanRequest } =
    useHwQrState({
      isEnabled: Boolean(strategy.walletAddress),
      currentStatus: progress.status,
      walletAddress: strategy.walletAddress,
    });

  // ── Flow state machine (initial submit, retry, cancel, done) ──────
  const {
    isRetrying,
    handleCancel,
    handleTryAgain,
    handleReconnect,
    handleDone,
  } = useHwSwapLifecycle({
    strategy,
    ensureDeviceReady,
    setPendingOperationAddress,
    isQrHardwareWallet,
  });

  const isSigning = useMemo(() => {
    if (
      progress.status !== HardwareWalletsSwapsStatus.Waiting &&
      progress.status !== HardwareWalletsSwapsStatus.Submitted
    ) {
      return false;
    }
    const activeStep = progress.steps[progress.currentStep];
    return activeStep?.status === HardwareWalletsSwapsStepStatus.Signing;
  }, [progress.currentStep, progress.status, progress.steps]);

  const signingTitle = useMemo(() => {
    // QR wallets use a two-scan cycle per transaction (display + camera).
    // This title covers the display phase (Phase A); the camera phase
    // (Phase B) title lives in HwQrScanner. Scan-step math is centralised
    // in step-helpers to avoid bare "* 2" literals at every call site.
    if (isQrHardwareWallet) {
      return strings('bridge.hardware_wallet_progress.qr_display_step_text', {
        current: getDisplayScanStep(progress.currentStep || 0),
        total: getTotalQrScans(progress.totalSteps || 1),
      });
    }
    const totalSteps = progress.totalSteps || 1;
    return strings('bridge.hardware_wallet_progress.confirm_title', {
      current: (progress.currentStep || 0) + 1,
      total: totalSteps,
    });
  }, [progress.currentStep, progress.totalSteps, isQrHardwareWallet]);

  const isFinalQrCode = useMemo(
    () =>
      progress.steps.length > 0 &&
      progress.currentStep >= progress.steps.length - 1,
    [progress.currentStep, progress.steps],
  );

  const title = useMemo(() => {
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
  }, [progress.status, signingTitle]);

  const handleHeaderClose =
    progress.status === HardwareWalletsSwapsStatus.Submitted
      ? handleDone
      : handleCancel;

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
          onPress={handleHeaderClose}
        />
        <Box twClassName="h-10 w-10" />
      </Box>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-4 pb-4`}
        showsVerticalScrollIndicator={false}
      >
        <HwSwapAnimation progress={progress} />

        <Text
          testID={HardwareWalletsSwapsSelectorsIDs.TITLE}
          variant={TextVariant.HeadingLg}
          twClassName="mb-8"
        >
          {title}
        </Text>

        <Box>
          {progress.steps.map((step, index) => {
            const isFeeTransfer =
              step.kind === HardwareWalletsSwapsStepKind.FeeTransfer;
            return (
              <StepRow
                key={`${step.kind}-${index}`}
                step={step}
                index={index}
                isLast={index === progress.steps.length - 1}
                amount={strategy.displayedAmount}
                tokenSymbol={
                  isFeeTransfer
                    ? strategy.gasTokenSymbol
                    : strategy.displayedTokenSymbol
                }
                isQrWallet={
                  isQrHardwareWallet &&
                  step.status === HardwareWalletsSwapsStepStatus.Signing
                }
                pendingScanRequest={
                  step.status === HardwareWalletsSwapsStepStatus.Signing
                    ? pendingScanRequest
                    : undefined
                }
              />
            );
          })}
        </Box>
      </ScrollView>

      <Box gap={4} padding={4}>
        {showInlineQrSigning && isSigning ? (
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonBaseSize.Lg}
            isFullWidth
            testID={HardwareWalletsSwapsSelectorsIDs.SCAN_NEXT_QR_BUTTON}
            onPress={() =>
              // Scan-based numbering: each transaction has two scans
              // (display + camera). Pass the camera-phase scan step and
              // total scans so HwQrScanner shows the correct Phase B title.
              navigation.navigate(Routes.BRIDGE.HW_QR_SCANNER, {
                currentStep: getCameraScanStep(progress.currentStep),
                totalSteps: getTotalQrScans(progress.totalSteps),
              })
            }
          >
            {strings(
              isFinalQrCode
                ? 'bridge.hardware_wallet_progress.scan_final_qr_code'
                : 'bridge.hardware_wallet_progress.scan_next_qr_code',
            )}
          </Button>
        ) : null}
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
