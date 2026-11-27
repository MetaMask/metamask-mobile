import React, { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import {
  AvatarAccount,
  AvatarAccountSize,
  AvatarAccountVariant,
  AvatarNetwork,
  AvatarNetworkSize,
  BottomSheet,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';
import { NETWORKS_CHAIN_ID } from '../../../../../constants/network';
import { formatAddress } from '../../../../../util/address';
import { getNetworkImageSource } from '../../../../../util/networks';
import type { KalshiWalletNetwork } from './demoOnboardingConfig';
import { KALSHI_ONBOARDING_MESSAGES } from './kalshiOnboardingMessages';
import { KalshiDemoOnboardingTestIds as TestIds } from './KalshiDemoOnboarding.testIds';
import type { KalshiActivation } from './useKalshiActivation';

/** Display name and icon source for each payout network. */
const WALLET_NETWORKS: Record<
  KalshiWalletNetwork,
  { name: string; chainId: string }
> = {
  base: { name: 'Base', chainId: NETWORKS_CHAIN_ID.BASE },
  polygon: { name: 'Polygon', chainId: NETWORKS_CHAIN_ID.POLYGON },
};

interface KalshiActivationModalProps {
  activation: KalshiActivation;
  walletAddress?: string;
  network: KalshiWalletNetwork;
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
  const walletNetwork = WALLET_NETWORKS[network];
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
                  <>
                    <Box
                      flexDirection={BoxFlexDirection.Row}
                      alignItems={BoxAlignItems.Center}
                      twClassName="gap-3"
                    >
                      <AvatarAccount
                        size={AvatarAccountSize.Md}
                        address={walletAddress}
                        variant={AvatarAccountVariant.Maskicon}
                      />
                      <Box twClassName="min-w-0 flex-1">
                        <Text
                          variant={TextVariant.BodySm}
                          color={TextColor.TextAlternative}
                          numberOfLines={1}
                          testID={TestIds.WALLET_ADDRESS}
                        >
                          {formatAddress(walletAddress, 'short')}
                        </Text>
                      </Box>
                      <Tag
                        twClassName="shrink-0 self-center rounded-full bg-alternative px-2 py-0.5"
                        startAccessory={
                          <AvatarNetwork
                            size={AvatarNetworkSize.Xs}
                            name={walletNetwork.name}
                            src={getNetworkImageSource({
                              chainId: walletNetwork.chainId,
                            })}
                          />
                        }
                        severity={TagSeverity.Neutral}
                        testID={TestIds.WALLET_NETWORK}
                      >
                        <Text>{walletNetwork.name}</Text>
                      </Tag>
                    </Box>
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      Activate to send your Kalshi withdrawals to this wallet.
                    </Text>
                  </>
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
