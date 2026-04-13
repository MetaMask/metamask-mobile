import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  Button,
  ButtonVariant,
  ButtonBaseSize,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import BadgeNetwork from '../../../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';
import { getNetworkImageSource } from '../../../../../../util/networks';
import type { Hex } from '@metamask/utils';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import SourceTokenPicker from './SourceTokenPicker';
import RewardsAnimations, {
  RewardAnimationState,
} from '../../../../../UI/Rewards/components/RewardPointsAnimation';
import AddRewardsAccount from '../../../../../UI/Rewards/components/AddRewardsAccount/AddRewardsAccount';
import { strings } from '../../../../../../../locales/i18n';

const USD_PRESETS = ['1', '20', '50', '100'];

interface QuickBuyFooterProps {
  usdAmount: string;
  sourceToken: BridgeToken | undefined;
  sourceChainId: Hex;
  sourceTokenOptions: BridgeToken[];
  selectedSourceToken: BridgeToken | undefined;
  isSourcePickerOpen: boolean;
  setIsSourcePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedSourceToken: React.Dispatch<
    React.SetStateAction<BridgeToken | undefined>
  >;
  sourceBalanceFiat: string | undefined;
  estimatedPoints: number | undefined;
  isRewardsLoading: boolean;
  shouldShowLiveRewardsEstimate: boolean;
  shouldShowRewardsOptInCta: boolean;
  shouldShowRewardsFallbackZero: boolean;
  hasRewardsError: boolean;
  rewardsAccountScope: string | null | undefined;
  isConfirmDisabled: boolean;
  isConfirmLoading: boolean;
  getButtonLabel: () => string;
  onPresetPress: (preset: string) => void;
  onConfirm: () => Promise<void>;
  colors: { icon: { alternative: string } };
}

const QuickBuyFooter: React.FC<QuickBuyFooterProps> = ({
  usdAmount,
  sourceToken,
  sourceChainId,
  sourceTokenOptions,
  selectedSourceToken,
  isSourcePickerOpen,
  setIsSourcePickerOpen,
  setSelectedSourceToken,
  sourceBalanceFiat,
  estimatedPoints,
  isRewardsLoading,
  shouldShowLiveRewardsEstimate,
  shouldShowRewardsOptInCta,
  shouldShowRewardsFallbackZero,
  hasRewardsError,
  rewardsAccountScope,
  isConfirmDisabled,
  isConfirmLoading,
  getButtonLabel,
  onPresetPress,
  onConfirm,
  colors,
}) => (
  <Box twClassName="w-full">
    {/* Preset pills */}
    <Box twClassName="pt-4 pb-6 px-4">
      <Box flexDirection={BoxFlexDirection.Row} gap={3}>
        {USD_PRESETS.map((preset) => (
          <Box key={preset} twClassName="flex-1">
            <Button
              variant={
                usdAmount === preset
                  ? ButtonVariant.Primary
                  : ButtonVariant.Secondary
              }
              size={ButtonBaseSize.Md}
              onPress={() => onPresetPress(preset)}
              isFullWidth
              testID={`quick-buy-preset-${preset}`}
            >
              {`$${preset}`}
            </Button>
          </Box>
        ))}
      </Box>
    </Box>

    {/* Footer details */}
    <Box twClassName="px-4 pb-6" gap={6}>
      <Box gap={4}>
        {/* Pay with row */}
        <TouchableOpacity
          onPress={() => setIsSourcePickerOpen((prev) => !prev)}
          disabled={sourceTokenOptions.length === 0}
          testID="quick-buy-pay-with-row"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('social_leaderboard.quick_buy.pay_with')}
            </Text>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
            >
              <BadgeWrapper
                badgePosition={BadgePosition.BottomRight}
                badgeElement={
                  <BadgeNetwork
                    name={sourceToken?.symbol ?? ''}
                    imageSource={getNetworkImageSource({
                      chainId: sourceChainId,
                    })}
                  />
                }
              >
                <AvatarToken
                  name={sourceToken?.symbol ?? ''}
                  src={
                    sourceToken?.image ? { uri: sourceToken.image } : undefined
                  }
                  size={AvatarTokenSize.Xs}
                />
              </BadgeWrapper>
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                {sourceToken?.symbol ?? ''}
              </Text>
              {sourceBalanceFiat && (
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  {`(${sourceBalanceFiat})`}
                </Text>
              )}
              <Icon
                name={
                  isSourcePickerOpen ? IconName.ArrowUp : IconName.ArrowDown
                }
                size={IconSize.Sm}
                color={colors.icon.alternative}
              />
            </Box>
          </Box>
        </TouchableOpacity>

        {/* Inline source token dropdown */}
        {isSourcePickerOpen && (
          <SourceTokenPicker
            options={sourceTokenOptions}
            selectedToken={selectedSourceToken}
            onSelect={(token) => {
              setSelectedSourceToken(token);
              setIsSourcePickerOpen(false);
            }}
          />
        )}

        {/* Total row */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('social_leaderboard.quick_buy.total')}
            </Text>
            <Icon
              name={IconName.Info}
              size={IconSize.Sm}
              color={colors.icon.alternative}
            />
          </Box>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {`$${usdAmount || '0'}`}
          </Text>
        </Box>

        {/* Est. points row */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('social_leaderboard.quick_buy.est_points')}
            </Text>
            <Icon
              name={IconName.Info}
              size={IconSize.Sm}
              color={colors.icon.alternative}
            />
          </Box>
          <Box alignItems={BoxAlignItems.End}>
            {shouldShowLiveRewardsEstimate ? (
              <RewardsAnimations
                value={estimatedPoints ?? 0}
                state={
                  isRewardsLoading
                    ? RewardAnimationState.Loading
                    : hasRewardsError
                      ? RewardAnimationState.ErrorState
                      : RewardAnimationState.Idle
                }
              />
            ) : shouldShowRewardsOptInCta ? (
              <AddRewardsAccount
                testID="quick-buy-add-rewards-account"
                account={rewardsAccountScope ?? undefined}
              />
            ) : shouldShowRewardsFallbackZero ? (
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                0
              </Text>
            ) : (
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                -
              </Text>
            )}
          </Box>
        </Box>
      </Box>

      {/* Buy button */}
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonBaseSize.Lg}
        isFullWidth
        isDisabled={isConfirmDisabled}
        isLoading={isConfirmLoading}
        onPress={onConfirm}
        testID="quick-buy-confirm-button"
      >
        {getButtonLabel()}
      </Button>
    </Box>
  </Box>
);

export default QuickBuyFooter;
