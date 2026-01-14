import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import useRewardsToast from '../../hooks/useRewardsToast';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import { Linking, TouchableOpacity } from 'react-native';
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
  FontWeight,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { SeasonRewardType } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { useSelector } from 'react-redux';
import { selectSelectedAccountGroup } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { selectIconSeedAddressByAccountGroupId } from '../../../../../selectors/multichainAccounts/accounts';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import { RootState } from '../../../../../reducers';
import AvatarAccount from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { createAccountSelectorNavDetails } from '../../../../Views/AccountSelector';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

export interface ModalAction {
  label: string;
  onPress: (input?: string) => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}

interface EndOfSeasonClaimBottomSheetProps {
  route: {
    params: {
      seasonRewardId: string;
      url?: string;
      title: string;
      description?: string;
      rewardType: SeasonRewardType;
      showAccount?: boolean;
    };
  };
}

/**
 * Bottom sheet modal for claiming end of season rewards.
 */

const EndOfSeasonClaimBottomSheet = ({
  route,
}: EndOfSeasonClaimBottomSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const tw = useTailwind();
  const { showToast: showRewardsToast, RewardsToastOptions } =
    useRewardsToast();
  const { trackEvent, createEventBuilder } = useMetrics();
  const {
    seasonRewardId,
    title,
    description,
    url,
    rewardType,
    showAccount = false,
  } = route.params;
  const navigation = useNavigation();
  const hasTrackedRewardViewed = useRef(false);

  // Account group selectors
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const avatarAccountType = useSelector(selectAvatarAccountType);

  // Get EVM address for avatar using the account group ID
  const evmAddress = useSelector((state: RootState) => {
    if (!selectedAccountGroup?.id) return undefined;
    try {
      const selector = selectIconSeedAddressByAccountGroupId(
        selectedAccountGroup.id,
      );
      return selector(state);
    } catch {
      return undefined;
    }
  });

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
    try {
      switch (rewardType) {
        case SeasonRewardType.NANSEN:
          if (!url) return;
          Linking.openURL(url);
          break;
        case SeasonRewardType.LINEA_TOKENS:
          //TODO: claim linea tokens
          break;
      }

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
    rewardType,
    trackEvent,
    createEventBuilder,
    seasonRewardId,
    title,
    handleModalClose,
    showToast,
    url,
  ]);

  const confirmAction = useMemo(() => {
    switch (rewardType) {
      case SeasonRewardType.LINEA_TOKENS:
        return {
          label: strings('rewards.end_of_season_rewards.confirm_label'),
          onPress: handleClaimReward,
          variant: ButtonVariant.Primary,
        };
      default:
        return {
          label: strings('rewards.end_of_season_rewards.access_label'),
          onPress: handleClaimReward,
          variant: ButtonVariant.Primary,
        };
    }
  }, [rewardType, handleClaimReward]);

  const renderActions = () => (
    <Box twClassName="w-full">
      <Button
        variant={confirmAction.variant || ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={confirmAction.onPress}
        twClassName="w-full"
        testID={REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON}
      >
        {confirmAction.label}
      </Button>
    </Box>
  );

  const renderTitle = () => (
    <Box twClassName="flex-col items-center justify-center w-full">
      <Text variant={TextVariant.HeadingLg} twClassName="text-center">
        {title}
      </Text>
    </Box>
  );

  const renderDescription = () => (
    <Box twClassName="my-4 w-full">
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        twClassName="text-text-alternative"
      >
        {description}
      </Text>
    </Box>
  );

  const handleOpenAccountSelector = useCallback(() => {
    navigation.navigate(
      ...createAccountSelectorNavDetails({
        disablePrivacyMode: true,
        disableAddAccountButton: true,
      }),
    );
  }, [navigation]);

  const renderAccountSection = () => {
    if (!showAccount || !selectedAccountGroup) {
      return null;
    }

    return (
      <Box twClassName="my-4 w-full">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName="text-text-alternative mb-2"
        >
          {strings('rewards.end_of_season_rewards.select_account_description')}
        </Text>
        <TouchableOpacity
          onPress={handleOpenAccountSelector}
          style={tw.style(
            'flex-row items-center rounded-lg bg-background-muted p-3',
          )}
          testID={REWARDS_VIEW_SELECTORS.CLAIM_MODAL_ACCOUNT_SELECTOR}
        >
          <AvatarAccount
            accountAddress={
              evmAddress || '0x0000000000000000000000000000000000000000'
            }
            type={avatarAccountType}
            size={AvatarSize.Md}
          />
          <Box
            flexDirection={BoxFlexDirection.Column}
            twClassName="flex-1 ml-3"
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              numberOfLines={1}
            >
              {selectedAccountGroup.metadata.name}
            </Text>
          </Box>
          <Icon name={IconName.ArrowDown} size={IconSize.Sm} />
        </TouchableOpacity>
      </Box>
    );
  };

  return (
    <BottomSheet ref={sheetRef} testID={REWARDS_VIEW_SELECTORS.CLAIM_MODAL}>
      <BottomSheetHeader onClose={handleModalClose}>
        {strings('rewards.end_of_season_rewards.redeem_your_reward')}
      </BottomSheetHeader>
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="px-4"
      >
        {renderTitle()}
        {description && renderDescription()}
        {renderAccountSection()}
        {renderActions()}
      </Box>
    </BottomSheet>
  );
};

export default EndOfSeasonClaimBottomSheet;
