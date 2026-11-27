import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal } from 'react-native';
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
  FontWeight,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';

import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';
import { NETWORKS_CHAIN_ID } from '../../../../../constants/network';
import { formatAddress } from '../../../../../util/address';
import { getNetworkImageSource } from '../../../../../util/networks';
import type { KalshiWalletNetwork } from './demoOnboardingConfig';
import type { KalshiMfaChallenge } from '../../contracts/v1/onboarding';
import type { OnboardingMessage } from './kalshiDemoOnboardingMachine';
import type { KalshiDemoOnboarding } from './useKalshiDemoOnboarding';
import { KalshiDemoOnboardingTestIds as TestIds } from './KalshiDemoOnboarding.testIds';
import type { KalshiPayoutDestinationMode } from './kalshiPayoutDestination';

/** Literal error copy. Temporary slice: no locale entries. */
const MESSAGES: Record<OnboardingMessage, string> = {
  generic: 'Something went wrong.',
  code_incorrect: "That code didn't work.",
  expired: 'Your link request expired. Start again.',
  signup_incomplete: 'Finish signing up on Kalshi demo first.',
  account_blocked: "This Kalshi account can't be linked.",
  new_account_failed:
    "We couldn't create a demo account for this email. Try an existing Kalshi demo account.",
  wallet_invalid: 'Kalshi demo rejected this wallet address.',
  rate_limited: 'Try again in a moment.',
  unsupported: "This account can't be linked in the demo flow.",
  review_timeout: 'Kalshi is still checking this account. Try again later.',
  demo_unavailable: "Demo sign-up isn't available right now.",
};

/** Title for the second-factor step, from what Kalshi said it will use. */
const mfaTitle = (mfa: KalshiMfaChallenge | undefined): string => {
  switch (mfa?.method) {
    case 'sms':
      return mfa.phoneLast4
        ? `Enter the code Kalshi texted to the number ending ${mfa.phoneLast4}`
        : 'Enter the code Kalshi texted to your phone';
    case 'authenticator-app':
      return 'Enter the code from your authenticator app';
    case 'email':
      return mfa.obfuscatedEmail
        ? `Enter the code Kalshi emailed to ${mfa.obfuscatedEmail}`
        : 'Enter the code Kalshi emailed to you';
    default:
      return 'Enter your Kalshi verification code';
  }
};

/** Display name and icon source for each payout network. */
const WALLET_NETWORKS: Record<
  KalshiWalletNetwork,
  { name: string; chainId: string }
> = {
  base: { name: 'Base', chainId: NETWORKS_CHAIN_ID.BASE },
  polygon: { name: 'Polygon', chainId: NETWORKS_CHAIN_ID.POLYGON },
};

/** A wallet account that can receive Kalshi withdrawals. */
export interface KalshiPayoutAccount {
  address: string;
  name: string;
}

interface KalshiDemoOnboardingModalProps {
  onboarding: KalshiDemoOnboarding;
  walletAddress?: string;
  network: KalshiWalletNetwork;
  mode: KalshiPayoutDestinationMode;
  account?: KalshiPayoutAccount;
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
    return () => clearTimeout(timer);
  }, [cooldownSec]);
  return coolingDown;
};

/**
 * Temporary demo onboarding sheet (mobile plan §1). No designs exist, so it
 * uses design-system parts only. Presentational: every action goes through
 * the state machine.
 */
export const KalshiDemoOnboardingModal = ({
  onboarding,
  walletAddress,
  network,
  mode,
  account,
}: KalshiDemoOnboardingModalProps) => {
  const { state } = onboarding;
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const coolingDown = useCooldown(state.cooldownSec);
  const disabled = state.busy || coolingDown;

  const message = state.message ? (
    <Text
      variant={TextVariant.BodySm}
      color={
        state.step === 'done' ? TextColor.TextDefault : TextColor.ErrorDefault
      }
      testID={TestIds.MESSAGE}
    >
      {MESSAGES[state.message]}
    </Text>
  ) : null;

  const renderStep = () => {
    switch (state.step) {
      case 'email':
        return (
          <>
            <Text variant={TextVariant.HeadingSm}>
              Link a Kalshi {mode.kind === 'demo' ? 'demo ' : ''}account
            </Text>
            <TextField
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              isDisabled={state.busy}
              inputProps={{
                autoCapitalize: 'none',
                autoComplete: 'email',
                keyboardType: 'email-address',
                accessibilityLabel: 'Email',
              }}
              testID={TestIds.EMAIL_INPUT}
            />
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              Use your own Kalshi {mode.kind === 'demo' ? 'demo ' : ''}account.
              Linking moves it from any other MetaMask profile.
            </Text>
            {message}
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              isLoading={state.busy}
              isDisabled={disabled || email.trim().length === 0}
              onPress={() => onboarding.submitEmail(email)}
              testID={TestIds.CONTINUE}
            >
              Continue
            </Button>
            <Button
              variant={ButtonVariant.Tertiary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={onboarding.dismiss}
              testID={TestIds.NOT_NOW}
            >
              Not now
            </Button>
          </>
        );
      case 'code':
        return (
          <>
            <Text variant={TextVariant.HeadingSm}>
              Enter the code Kalshi sent
            </Text>
            <TextField
              value={code}
              onChangeText={setCode}
              placeholder="Code"
              isDisabled={state.busy}
              inputProps={{
                keyboardType: 'number-pad',
                autoComplete: 'one-time-code',
                accessibilityLabel: 'Code',
              }}
              testID={TestIds.CODE_INPUT}
            />
            {message}
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              isLoading={state.busy}
              isDisabled={disabled || !/^\d{6,8}$/u.test(code.trim())}
              onPress={() => onboarding.verifyCode(code)}
              testID={TestIds.VERIFY}
            >
              Verify
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              isDisabled={disabled}
              onPress={onboarding.resendCode}
              testID={TestIds.RESEND}
            >
              Resend
            </Button>
          </>
        );
      case 'mfa':
        return (
          <>
            <Text variant={TextVariant.HeadingSm} testID={TestIds.MFA_TITLE}>
              {mfaTitle(state.mfa)}
            </Text>
            <TextField
              value={mfaCode}
              onChangeText={setMfaCode}
              placeholder="Code"
              isDisabled={state.busy}
              inputProps={{
                keyboardType: 'number-pad',
                autoComplete: 'one-time-code',
                accessibilityLabel: 'Code',
              }}
              testID={TestIds.MFA_CODE_INPUT}
            />
            {message}
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              isLoading={state.busy}
              isDisabled={disabled || !/^\d{6,8}$/u.test(mfaCode.trim())}
              onPress={() => onboarding.verifyCode(mfaCode)}
              testID={TestIds.MFA_VERIFY}
            >
              Verify
            </Button>
            <Button
              variant={ButtonVariant.Tertiary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={onboarding.dismiss}
              testID={TestIds.NOT_NOW}
            >
              Not now
            </Button>
          </>
        );
      case 'working':
        return (
          <Box twClassName="items-center gap-3 py-6" testID={TestIds.WORKING}>
            <ActivityIndicator />
            <Text variant={TextVariant.BodyMd}>
              Setting up your Kalshi {mode.kind === 'demo' ? 'demo ' : ''}
              account…
            </Text>
          </Box>
        );
      case 'wallet': {
        const walletNetwork = WALLET_NETWORKS[network];
        return (
          <>
            <Text variant={TextVariant.HeadingSm}>Withdrawal wallet</Text>
            {walletAddress ? (
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
                <Box twClassName="min-w-0 flex-1 gap-0.5">
                  {mode.kind === 'production' && account?.name ? (
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                      numberOfLines={1}
                      testID={TestIds.WALLET_NAME}
                    >
                      {account.name}
                    </Text>
                  ) : null}
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
            ) : (
              <Text variant={TextVariant.BodyMd} color={TextColor.ErrorDefault}>
                Select an Ethereum account to continue.
              </Text>
            )}
            {message}
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              isLoading={state.busy}
              isDisabled={disabled || !walletAddress}
              onPress={onboarding.activate}
              testID={TestIds.ACTIVATE}
            >
              Activate
            </Button>
          </>
        );
      }
      case 'done':
        return (
          <>
            <Text variant={TextVariant.BodyMd} testID={TestIds.DONE}>
              Your Kalshi {mode.kind === 'demo' ? 'demo ' : ''}account is
              linked.
            </Text>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={onboarding.dismiss}
              testID={TestIds.CLOSE}
            >
              Close
            </Button>
          </>
        );
      case 'error':
        return (
          <>
            {message}
            {state.retryable ? (
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                isFullWidth
                isDisabled={disabled}
                onPress={onboarding.retry}
                testID={TestIds.TRY_AGAIN}
              >
                Try again
              </Button>
            ) : null}
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={onboarding.dismiss}
              testID={TestIds.CLOSE}
            >
              Close
            </Button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onboarding.dismiss}
    >
      <ModalSafeAreaProvider>
        <BottomSheet onClose={onboarding.dismiss} testID={TestIds.SHEET}>
          <Box twClassName="gap-4 px-4 pb-4 pt-2">{renderStep()}</Box>
        </BottomSheet>
      </ModalSafeAreaProvider>
    </Modal>
  );
};
