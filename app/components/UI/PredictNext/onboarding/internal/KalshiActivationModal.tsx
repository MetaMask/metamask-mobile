import React, { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import {
  BottomSheet,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';
import { KALSHI_ONBOARDING_MESSAGES } from './kalshiOnboardingMessages';
import { KalshiDemoOnboardingTestIds as TestIds } from './KalshiDemoOnboarding.testIds';
import type { KalshiActivation } from './useKalshiActivation';

interface KalshiActivationModalProps {
  activation: KalshiActivation;
  walletAddress?: string;
  network: string;
  onDismiss: () => void;
}

/** Disables the buttons for `Retry-After` seconds after a rate limit. */
const useCooldown = (cooldownSec: number | undefined): boolean => {
  const [coolingDown, setCoolingDown] = useState(false);
  useEffect(() => {
    if (!cooldownSec) {
      setCoolingDown(false);
      return undefined;
    }
    setCoolingDown(true);
    const timer = setTimeout(() => setCoolingDown(false), cooldownSec * 1000);
    return (): void => {
      clearTimeout(timer);
    };
  }, [cooldownSec]);
  return coolingDown;
};

/**
 * The activation step of the Kalshi demo onboarding. Presentational: the
 * trigger owns whether it is shown, `useKalshiActivation` owns the write.
 */
export const KalshiActivationModal = ({
  activation,
  walletAddress,
  network,
  onDismiss,
}: KalshiActivationModalProps): React.ReactElement => {
  const coolingDown = useCooldown(activation.failure?.cooldownSec);
  const disabled = activation.busy || coolingDown;
  const action = activation.failure?.action ?? 'activate';
  const message = activation.failure
    ? KALSHI_ONBOARDING_MESSAGES[activation.failure.message]
    : undefined;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <ModalSafeAreaProvider>
        <BottomSheet onClose={onDismiss} testID={TestIds.SHEET}>
          <Box twClassName="gap-4 px-4 pb-4 pt-2">
            <Text variant={TextVariant.HeadingSm}>
              {activation.completed ? 'Account ready' : 'Withdrawal wallet'}
            </Text>
            {activation.completed ? (
              <>
                <Text variant={TextVariant.BodyMd} testID={TestIds.DONE}>
                  Your withdrawal wallet is set. You can start trading.
                </Text>
                <Button
                  variant={ButtonVariant.Primary}
                  size={ButtonSize.Lg}
                  isFullWidth
                  onPress={onDismiss}
                  testID={TestIds.CLOSE}
                >
                  Done
                </Button>
              </>
            ) : (
              <>
                {walletAddress ? (
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    testID={TestIds.WALLET_ADDRESS}
                  >
                    Withdrawals go to {walletAddress} on {network}. Activate to
                    start trading.
                  </Text>
                ) : (
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.ErrorDefault}
                  >
                    Select an Ethereum account to continue.
                  </Text>
                )}
                {message ? (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.ErrorDefault}
                    testID={TestIds.MESSAGE}
                  >
                    {message}
                  </Text>
                ) : null}
                {action !== 'none' ? (
                  <Button
                    variant={ButtonVariant.Primary}
                    size={ButtonSize.Lg}
                    isFullWidth
                    isLoading={activation.busy}
                    isDisabled={disabled || !walletAddress}
                    onPress={
                      action === 'checkAgain'
                        ? activation.checkAgain
                        : activation.activate
                    }
                    testID={TestIds.ACTIVATE}
                  >
                    {action === 'checkAgain' ? 'Check again' : 'Activate'}
                  </Button>
                ) : null}
                <Button
                  variant={ButtonVariant.Tertiary}
                  size={ButtonSize.Lg}
                  isFullWidth
                  onPress={onDismiss}
                  testID={TestIds.NOT_NOW}
                >
                  Not now
                </Button>
              </>
            )}
          </Box>
        </BottomSheet>
      </ModalSafeAreaProvider>
    </Modal>
  );
};
