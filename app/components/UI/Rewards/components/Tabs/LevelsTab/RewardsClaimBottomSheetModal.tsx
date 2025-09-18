import React, { useCallback, useMemo, useRef, useState } from 'react';
import useClaimReward from '../../../hooks/useClaimReward';
import {
  ClaimRewardDto,
  SeasonRewardType,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../../locales/i18n';
import {
  BoxFlexDirection,
  ButtonVariant,
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  IconName,
  Icon,
  Text,
  TextVariant,
  IconSize,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import { Linking, TouchableOpacity } from 'react-native';
import { formatUrl } from '../../../utils/formatUtils';
import TextField, {
  TextFieldSize,
} from '../../../../../../component-library/components/Form/TextField';
import { BannerAlertSeverity } from '../../../../../../component-library/components/Banners/Banner';
import BannerAlert from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import useRewardsToast from '../../../hooks/useRewardsToast';

export interface ModalAction {
  label: string;
  onPress: (input?: string) => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}

interface RewardsClaimBottomSheetModalProps {
  route: {
    params: {
      rewardId: string;
      rewardType: SeasonRewardType;
      claimUrl?: string;
      isLocked: boolean;
      hasClaimed: boolean;
      title: string;
      icon: IconName;
      description: string;
      showInput?: boolean;
      inputPlaceholder?: string;
    };
  };
}

/**
 * Modal for claim rewards
 */

const RewardsClaimBottomSheetModal = ({
  route,
}: RewardsClaimBottomSheetModalProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { showToast: showRewardsToast, RewardsToastOptions } =
    useRewardsToast();
  const tw = useTailwind();
  const { claimReward, isClaimingReward, claimRewardError } = useClaimReward();
  const [inputValue, setInputValue] = useState('');
  const {
    rewardId,
    rewardType,
    claimUrl,
    isLocked,
    hasClaimed,
    title,
    icon,
    description,
    showInput = false,
    inputPlaceholder,
  } = route.params;
  const navigation = useNavigation();

  const handleModalClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const showToast = useCallback(() => {
    // Show success toast
    showRewardsToast(
      RewardsToastOptions.success(
        strings('rewards.unlocked_rewards.reward_claimed'),
        title,
      ),
    );
  }, [RewardsToastOptions, showRewardsToast, title]);

  const handleClaimReward = useCallback(async () => {
    const claimData = {} as ClaimRewardDto;

    if (rewardType === SeasonRewardType.ALPHA_FOX_INVITE && inputValue) {
      claimData.data = { telegramHandle: inputValue };
    }

    try {
      await claimReward(rewardId, claimData);
      handleModalClose();
      showToast();
    } catch (error) {
      // keep modal open to display error message
    }
  }, [
    claimReward,
    handleModalClose,
    inputValue,
    rewardId,
    rewardType,
    showToast,
  ]);

  const confirmAction = useMemo(() => {
    if (isLocked || hasClaimed) {
      return {
        label: strings('rewards.upcoming_rewards.cta_label'),
        onPress: handleModalClose,
        variant: ButtonVariant.Secondary,
      };
    }

    switch (rewardType) {
      case SeasonRewardType.GENERIC:
      case SeasonRewardType.PERPS_DISCOUNT:
        return {
          label: strings('rewards.upcoming_rewards.cta_label'),
          onPress: handleModalClose,
          variant: ButtonVariant.Primary,
        };
      case SeasonRewardType.POINTS_BOOST:
        return {
          label: strings('rewards.unlocked_rewards.cta_label'),
          onPress: handleClaimReward,
          variant: ButtonVariant.Primary,
          disabled: isClaimingReward,
        };
      case SeasonRewardType.ALPHA_FOX_INVITE:
        return {
          label: strings('rewards.unlocked_rewards.cta_request_invite'),
          onPress: handleClaimReward,
          variant: ButtonVariant.Primary,
          disabled: isClaimingReward,
        };
      default:
        return {
          label: strings('rewards.upcoming_rewards.cta_label'),
          onPress: handleModalClose,
          variant: ButtonVariant.Secondary,
        };
    }
  }, [
    handleClaimReward,
    handleModalClose,
    hasClaimed,
    isClaimingReward,
    isLocked,
    rewardType,
  ]);

  const buttonDisabled = useMemo(
    () => confirmAction.disabled || (showInput && !inputValue.trim()),
    [confirmAction.disabled, showInput, inputValue],
  );

  const renderActions = () => (
    <Box twClassName="w-full">
      <Button
        variant={confirmAction.variant || ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={confirmAction.onPress}
        disabled={buttonDisabled}
        twClassName="w-full"
        testID={REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON}
      >
        {confirmAction.label}
      </Button>
    </Box>
  );

  const renderTitle = () => (
    <Box twClassName="flex-row items-center justify-between w-full">
      <Text variant={TextVariant.HeadingLg} twClassName="w-[80%]">
        {title}
      </Text>
      <Box
        twClassName={`h-12 w-12 rounded-full bg-muted items-center justify-center`}
        testID={REWARDS_VIEW_SELECTORS.TIER_REWARD_ICON}
      >
        <Icon
          name={icon}
          size={IconSize.Lg}
          twClassName="text-primary-default"
        />
      </Box>
    </Box>
  );

  const renderDescription = () => (
    <Box twClassName="my-4 w-full">
      <Text variant={TextVariant.BodyMd} twClassName="text-text-alternative">
        {description}
      </Text>
      {claimUrl && (
        <TouchableOpacity
          onPress={() => Linking.openURL(claimUrl)}
          style={tw.style('mt-2 flex-row items-center')}
        >
          <Text
            variant={TextVariant.BodySm}
            style={tw.style('text-primary-default underline mr-1')}
          >
            {formatUrl(claimUrl)}
          </Text>
          <Icon
            name={IconName.Export}
            size={IconSize.Sm}
            style={tw.style('text-primary-default')}
          />
        </TouchableOpacity>
      )}
    </Box>
  );

  const renderError = () => {
    if (claimRewardError) {
      return (
        <BannerAlert
          severity={BannerAlertSeverity.Error}
          description={claimRewardError}
          style={tw.style('my-4')}
          testID={REWARDS_VIEW_SELECTORS.CLAIM_MODAL_ERROR_MESSAGE}
        />
      );
    }
    return null;
  };

  const renderInput = () => {
    if (showInput) {
      return (
        <TextField
          placeholder={inputPlaceholder}
          onChangeText={setInputValue}
          value={inputValue}
          size={TextFieldSize.Lg}
          style={tw.style('bg-background-pressed my-4')}
        />
      );
    }
    return null;
  };

  return (
    <BottomSheet ref={sheetRef} testID={REWARDS_VIEW_SELECTORS.CLAIM_MODAL}>
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="p-4"
      >
        {renderTitle()}
        {renderDescription()}
        {renderInput()}
        {renderError()}
        {renderActions()}
      </Box>
    </BottomSheet>
  );
};

export default RewardsClaimBottomSheetModal;
