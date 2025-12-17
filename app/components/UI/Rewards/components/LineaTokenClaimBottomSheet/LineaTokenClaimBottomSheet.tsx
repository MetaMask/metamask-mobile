import React, { useCallback, useMemo, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  BoxFlexDirection,
  ButtonVariant,
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  IconName,
  ButtonIcon,
  Text,
  TextVariant,
  FontWeight,
  IconColor,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../../locales/i18n';
import useClaimLineaRewardToken from '../../hooks/useClaimLineaRewardToken';
import useLineaRewardTokens from '../../hooks/useLineaRewardTokens';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { useSelector } from 'react-redux';
import { formatAddress } from '../../../../../util/address';
import { selectResolvedSelectedAccountGroup } from '../../../../../selectors/multichainAccounts/accountTreeController';

interface LineaTokenClaimBottomSheetProps {
  route: {
    params: {
      rewardId: string;
    };
  };
}

/**
 * Bottom sheet modal for claiming LINEA token rewards.
 * Shows the reward amount and account info, then triggers the on-chain claim flow.
 */
const LineaTokenClaimBottomSheet = ({
  route,
}: LineaTokenClaimBottomSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { claimLineaReward, isLoading, error, claimRecipientAddress } =
    useClaimLineaRewardToken();
  const {
    lineaRewardTokens,
    isLoading: isLoadingBalance,
    isError: isBalanceError,
  } = useLineaRewardTokens();
  const accountGroup = useSelector(selectResolvedSelectedAccountGroup);

  const recipientDisplayName = useMemo(() => {
    if (accountGroup && claimRecipientAddress) {
      return `${accountGroup.metadata.name} (${formatAddress(claimRecipientAddress, 'short')})`;
    }
    if (accountGroup) {
      return accountGroup.metadata.name;
    }
    if (claimRecipientAddress) {
      return formatAddress(claimRecipientAddress, 'short');
    }
    return '';
  }, [accountGroup, claimRecipientAddress]);

  const { rewardId } = route.params;

  const handleDismiss = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClaim = useCallback(async () => {
    await claimLineaReward(rewardId);
    // Navigation to confirmation screen is handled by the hook
  }, [claimLineaReward, rewardId]);

  return (
    <BottomSheet ref={sheetRef}>
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="p-4"
      >
        {/* Close Button */}
        <Box twClassName="w-full flex-row justify-end">
          <ButtonIcon
            onPress={handleDismiss}
            iconName={IconName.Close}
            iconProps={{
              color: IconColor.IconDefault,
            }}
          />
        </Box>

        {/* Title */}
        <Box twClassName="w-full items-center mb-4">
          <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
            {strings('rewards.linea_token_claim.title')}
          </Text>
        </Box>

        {/* Reward Amount */}
        <Box twClassName="w-full items-center mb-4">
          {isLoadingBalance ? (
            <Text variant={TextVariant.HeadingLg} fontWeight={FontWeight.Bold}>
              {strings('rewards.linea_token_claim.loading_balance')}
            </Text>
          ) : (
            <Text variant={TextVariant.HeadingLg} fontWeight={FontWeight.Bold}>
              {strings('rewards.linea_token_claim.reward_earned', {
                amount: lineaRewardTokens?.amount ?? 0,
              })}
            </Text>
          )}
        </Box>

        {/* Account Info */}
        {recipientDisplayName && (
          <Box twClassName="w-full mb-4">
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-text-alternative text-center"
            >
              {strings('rewards.linea_token_claim.account_description', {
                accountName: recipientDisplayName,
              })}
            </Text>
          </Box>
        )}

        {/* ETH Reminder */}
        <Box twClassName="w-full mb-6">
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-text-alternative text-center"
          >
            {strings('rewards.linea_token_claim.eth_reminder')}
          </Text>
        </Box>

        {/* Error Banner */}
        {(error || isBalanceError) && (
          <Box twClassName="w-full mb-4">
            <RewardsErrorBanner
              title={strings('rewards.linea_token_claim.error_title')}
              description={
                error ?? strings('rewards.linea_token_claim.balance_error')
              }
            />
          </Box>
        )}

        {/* Claim Button */}
        <Box twClassName="w-full">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleClaim}
            isLoading={isLoading}
            disabled={isLoading}
            twClassName="w-full"
          >
            {strings('rewards.linea_token_claim.claim_button')}
          </Button>
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default LineaTokenClaimBottomSheet;
