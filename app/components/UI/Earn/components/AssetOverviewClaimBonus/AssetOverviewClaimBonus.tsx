import React, { useCallback, useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
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
import { strings } from '../../../../../../locales/i18n';
import { TokenI } from '../../../Tokens/types';
import { useMerklBonusClaim } from '../MerklRewards/hooks/useMerklBonusClaim';
import useTooltipModal from '../../../../hooks/useTooltipModal';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents, EVENT_NAME } from '../../../../../core/Analytics';
import { MUSD_EVENTS_CONSTANTS } from '../../constants/events/musdEvents';
import AppConstants from '../../../../../core/AppConstants';
import { selectNetworkConfigurationByChainId } from '../../../../../selectors/networkController';
import { RootState } from '../../../../../reducers';
import { ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS } from './AssetOverviewClaimBonus.testIds';
import { MUSD_CONVERSION_APY } from '../../constants/musd';

const { EVENT_LOCATIONS } = MUSD_EVENTS_CONSTANTS;

interface AssetOverviewClaimBonusProps {
  asset: TokenI;
}

const AssetOverviewClaimBonus: React.FC<AssetOverviewClaimBonusProps> = ({
  asset,
}) => {
  const { claimableReward, hasPendingClaim, isClaiming, claimRewards } =
    useMerklBonusClaim(asset, EVENT_LOCATIONS.ASSET_OVERVIEW);

  const { openTooltipModal } = useTooltipModal();
  const { trackEvent, createEventBuilder } = useAnalytics();

  // Used to prevent duplicate presses of the claim button.
  const isClaimPressedRef = useRef(false);
  const isLoading = isClaiming || hasPendingClaim;

  useEffect(() => {
    if (!isLoading) {
      isClaimPressedRef.current = false;
    }
  }, [isLoading]);

  const network = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, asset.chainId as Hex),
  );

  const handleTermsPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.MUSD_BONUS_TERMS_OF_USE_PRESSED)
        .addProperties({
          location: EVENT_LOCATIONS.ASSET_OVERVIEW_CLAIMABLE_BONUS_TOOLTIP,
          url: AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE,
        })
        .build(),
    );

    Linking.openURL(AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE);
  }, [createEventBuilder, trackEvent]);

  const handleInfoPress = useCallback(() => {
    trackEvent(
      createEventBuilder(EVENT_NAME.TOOLTIP_OPENED)
        .addProperties({
          location: EVENT_LOCATIONS.ASSET_OVERVIEW,
          tooltip_name: 'claim_bonus_info',
          related_text: 'Claimable bonus',
        })
        .build(),
    );

    openTooltipModal(
      strings('earn.claimable_bonus'),
      <Text variant={TextVariant.BodyMd}>
        {strings('earn.claimable_bonus_tooltip_with_percentage', {
          percentage: MUSD_CONVERSION_APY,
        })}{' '}
        <Text
          variant={TextVariant.BodyMd}
          onPress={handleTermsPress}
          twClassName="underline"
        >
          {strings('earn.musd_conversion.education.terms_apply')}
        </Text>
      </Text>,
      undefined,
      strings('earn.sounds_good'),
    );
  }, [openTooltipModal, handleTermsPress, trackEvent, createEventBuilder]);

  const handleClaimPress = useCallback(() => {
    if (isClaimPressedRef.current || isLoading) return;
    isClaimPressedRef.current = true;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.MUSD_CLAIM_BONUS_BUTTON_CLICKED)
        .addProperties({
          location: EVENT_LOCATIONS.ASSET_OVERVIEW,
          action_type: 'claim_bonus',
          button_text: strings('earn.claim'),
          network_chain_id: asset.chainId,
          network_name: network?.name,
          asset_symbol: asset.symbol,
        })
        .build(),
    );
    claimRewards();
  }, [
    isLoading,
    trackEvent,
    createEventBuilder,
    asset.chainId,
    asset.symbol,
    network?.name,
    claimRewards,
  ]);

  if (!claimableReward) {
    return null;
  }

  return (
    <Box
      twClassName="px-4"
      testID={ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CONTAINER}
    >
      {/* Divider */}
      <Box twClassName="h-px bg-border-muted my-4" />

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="pt-3 pb-4"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="flex-1"
        >
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="h-10 w-10 rounded-full bg-muted mr-4"
          >
            <Icon name={IconName.MoneyBag} size={IconSize.Lg} />
          </Box>

          <Box twClassName="flex-1">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="mb-1"
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                twClassName="mr-1"
              >
                {strings('earn.claimable_bonus')}
              </Text>
              <ButtonIcon
                iconName={IconName.Info}
                size={ButtonIconSize.Sm}
                iconProps={{ color: IconColor.IconDefault }}
                onPress={handleInfoPress}
                testID={ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.INFO_BUTTON}
              />
            </Box>
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Regular}
              color={TextColor.PrimaryDefault}
            >
              {strings('earn.percentage_bonus_on_linea', {
                percentage: MUSD_CONVERSION_APY,
              })}
            </Text>
          </Box>
        </Box>

        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName="text-text-default"
            testID={ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIMABLE_AMOUNT}
          >
            ${claimableReward}
          </Text>
        </Box>
      </Box>

      <Button
        testID={ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIM_BUTTON}
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        twClassName="w-full"
        onPress={handleClaimPress}
        isDisabled={isLoading}
        isLoading={isLoading}
      >
        {strings('earn.claim')}
      </Button>
    </Box>
  );
};

export default AssetOverviewClaimBonus;
