import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  BoxFlexDirection,
  ButtonVariant,
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { strings } from '../../../../../../locales/i18n';
import TextField, {
  TextFieldSize,
} from '../../../../../component-library/components/Form/TextField';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import useClaimReward from '../../hooks/useClaimReward';
import useRewardsToast from '../../hooks/useRewardsToast';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { ClaimRewardDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { validateEmail } from '../../utils/formatUtils';

interface MetalCardClaimBottomSheetProps {
  route: {
    params: {
      rewardId: string;
      seasonRewardId: string;
    };
  };
}

/**
 * Bottom sheet modal for claiming MetaMask Metal Card rewards.
 * Users provide their email and telegram contact info to claim the reward.
 */
const MetalCardClaimBottomSheet = ({
  route,
}: MetalCardClaimBottomSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const tw = useTailwind();
  const { showToast: showRewardsToast, RewardsToastOptions } =
    useRewardsToast();
  const { claimReward, isClaimingReward, claimRewardError } = useClaimReward();
  const { trackEvent, createEventBuilder } = useMetrics();

  const [email, setEmail] = useState('');
  const [telegram, setTelegram] = useState('');
  const [emailValidationError, setEmailValidationError] = useState(false);

  const { rewardId, seasonRewardId } = route.params;
  const title = strings('rewards.metal_card_claim.title');
  const hasTrackedRewardViewed = useRef(false);

  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
    setEmailValidationError(false);
  }, []);

  const handleModalClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const showToast = useCallback(() => {
    showRewardsToast(
      RewardsToastOptions.success(
        strings('rewards.unlocked_rewards.reward_claimed'),
        title,
      ),
    );
  }, [RewardsToastOptions, showRewardsToast, title]);

  useEffect(() => {
    if (!hasTrackedRewardViewed.current) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.REWARDS_REWARD_VIEWED)
          .addProperties({
            reward_id: seasonRewardId,
            reward_name: title,
          })
          .build(),
      );
      hasTrackedRewardViewed.current = true;
    }
  }, [trackEvent, createEventBuilder, seasonRewardId, title]);

  const handleClaimReward = useCallback(async () => {
    // Validate email before submitting
    if (!validateEmail(email.trim())) {
      setEmailValidationError(true);
      return;
    }

    const claimData: ClaimRewardDto = {
      data: {
        email: email.trim(),
      },
    };

    if (telegram.trim()) {
      claimData.data = {
        ...claimData.data,
        telegramHandle: telegram.trim(),
      };
    }

    try {
      await claimReward(rewardId, claimData);

      trackEvent(
        createEventBuilder(MetaMetricsEvents.REWARDS_REWARD_CLAIMED)
          .addProperties({
            reward_id: seasonRewardId,
            reward_name: title,
          })
          .build(),
      );

      handleModalClose();
      showToast();
    } catch {
      // keep modal open to display error message
    }
  }, [
    claimReward,
    handleModalClose,
    email,
    telegram,
    rewardId,
    seasonRewardId,
    title,
    showToast,
    trackEvent,
    createEventBuilder,
  ]);

  const confirmAction = useMemo(
    () => ({
      label: strings('rewards.metal_card_claim.submit_button'),
      onPress: handleClaimReward,
      variant: ButtonVariant.Primary,
      loading: isClaimingReward,
      disabled: isClaimingReward,
    }),
    [handleClaimReward, isClaimingReward],
  );

  const renderError = () => {
    if (claimRewardError && !isClaimingReward) {
      return (
        <Box twClassName="w-full mb-4">
          <RewardsErrorBanner
            title={strings('rewards.claim_reward_error.title')}
            description={claimRewardError}
          />
        </Box>
      );
    }
    return null;
  };

  return (
    <BottomSheet ref={sheetRef} keyboardAvoidingViewEnabled={false}>
      <BottomSheetHeader onClose={handleModalClose}>{title}</BottomSheetHeader>
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
      >
        <Box
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Start}
          justifyContent={BoxJustifyContent.Center}
          twClassName="px-4 pb-4"
        >
          {/* Description */}
          <Box twClassName="w-full mb-4">
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-text-alternative"
            >
              {strings('rewards.metal_card_claim.description')}
            </Text>
          </Box>

          {/* Contact Info */}
          <Box twClassName="w-full mb-4">
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-text-alternative"
            >
              {strings('rewards.metal_card_claim.contact_info')}
            </Text>
          </Box>

          {/* Email Input */}
          <Box twClassName="w-full mb-4">
            <Text variant={TextVariant.BodyMd} twClassName="mb-2">
              {strings('rewards.metal_card_claim.email_label')}
            </Text>
            <TextField
              textAlignVertical="center"
              textAlign="left"
              onChangeText={handleEmailChange}
              value={email}
              isError={emailValidationError}
              size={TextFieldSize.Lg}
              style={tw.style('bg-background-pressed')}
              keyboardType="email-address"
              autoCapitalize="none"
              isDisabled={isClaimingReward}
            />
            {emailValidationError && (
              <Text
                variant={TextVariant.BodySm}
                twClassName="text-error-default mt-1"
              >
                {strings('rewards.metal_card_claim.email_validation_error')}
              </Text>
            )}
          </Box>

          {/* Telegram Input */}
          <Box twClassName="w-full mb-6">
            <Text variant={TextVariant.BodyMd} twClassName="mb-2">
              {strings('rewards.metal_card_claim.telegram_label')}
            </Text>
            <TextField
              textAlignVertical="center"
              textAlign="left"
              placeholder={strings(
                'rewards.metal_card_claim.telegram_placeholder',
              )}
              onChangeText={setTelegram}
              value={telegram}
              size={TextFieldSize.Lg}
              style={tw.style('bg-background-pressed')}
              autoCapitalize="none"
              isDisabled={isClaimingReward}
            />
          </Box>

          {/* Error Banner */}
          {renderError()}

          {/* Submit Button */}
          <Box twClassName="w-full">
            <Button
              variant={confirmAction.variant}
              size={ButtonSize.Lg}
              onPress={confirmAction.onPress}
              disabled={confirmAction.disabled}
              isLoading={confirmAction.loading}
              twClassName="w-full"
            >
              {confirmAction.label}
            </Button>
          </Box>
        </Box>
      </KeyboardAwareScrollView>
    </BottomSheet>
  );
};

export default MetalCardClaimBottomSheet;
