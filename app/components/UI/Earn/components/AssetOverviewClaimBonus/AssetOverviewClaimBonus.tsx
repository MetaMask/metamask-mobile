import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
  IconColor,
  IconName,
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
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS } from './AssetOverviewClaimBonus.testIds';
import {
  MUSD_CONVERSION_APY,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
  isMusdToken,
} from '../../constants/musd';
import useTokenBalance from '../../../TokenDetails/hooks/useTokenBalance';
import { selectAsset } from '../../../../../selectors/assets/assets-list';
import { toFormattedAddress } from '../../../../../util/address';
import TagBase, {
  TagSeverity,
} from '../../../../../component-library/base-components/TagBase';

const { EVENT_LOCATIONS } = MUSD_EVENTS_CONSTANTS;

interface AssetOverviewClaimBonusProps {
  asset: TokenI;
}

const AssetOverviewClaimBonus: React.FC<AssetOverviewClaimBonusProps> = ({
  asset,
}) => {
  const {
    claimableReward,
    lifetimeBonusClaimed,
    hasPendingClaim,
    isClaiming,
    claimRewards,
  } = useMerklBonusClaim(asset, EVENT_LOCATIONS.ASSET_OVERVIEW);

  const { openTooltipModal } = useTooltipModal();
  const { trackEvent, createEventBuilder } = useAnalytics();

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

  // Use live balance from Redux store — route params may be stale.
  const { balance: liveBalance } = useTokenBalance(asset);

  // mUSD bonuses are distributed across both mainnet and Linea regardless of
  // which chain's asset details screen we're rendering, so the estimate must
  // sum the user's holdings on both chains. For non-mUSD eligible tokens we
  // keep the per-chain balance from useTokenBalance.
  const mainnetMusdAsset = useSelector((state: RootState) =>
    selectAsset(state, {
      address: toFormattedAddress(
        MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.MAINNET],
      ),
      chainId: CHAIN_IDS.MAINNET,
    }),
  );
  const lineaMusdAsset = useSelector((state: RootState) =>
    selectAsset(state, {
      address: toFormattedAddress(
        MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET],
      ),
      chainId: CHAIN_IDS.LINEA_MAINNET,
    }),
  );

  // State derivation
  const balance = isMusdToken(asset.address)
    ? (parseFloat(mainnetMusdAsset?.balance ?? '0') || 0) +
      (parseFloat(lineaMusdAsset?.balance ?? '0') || 0)
    : parseFloat(liveBalance || asset.balance) || 0;
  const hasBalance = balance > 0;
  const hasClaimable = claimableReward !== null;

  // Estimated annual bonus: token balance × APY% (mUSD is 1:1 with USD)
  const estimatedAnnualBonus = useMemo(
    () => balance * (MUSD_CONVERSION_APY / 100),
    [balance],
  );
  const formattedAnnualBonus = hasBalance
    ? `+$${estimatedAnnualBonus.toFixed(2)}`
    : '+$0.00';

  // Lifetime bonus: white $0.00 until first claim, then green +$X.
  const hasLifetimeBonus = Number(lifetimeBonusClaimed) > 0;
  const formattedLifetimeBonus = hasLifetimeBonus
    ? `+$${lifetimeBonusClaimed}`
    : '$0.00';

  // CTA state
  const { ctaLabel, ctaDisabled } = useMemo(() => {
    if (hasClaimable) {
      return {
        ctaLabel: strings('earn.claim_amount_bonus', {
          amount: claimableReward,
        }),
        ctaDisabled: false,
      };
    }
    if (hasBalance) {
      return {
        ctaLabel: strings('earn.accruing_next_bonus'),
        ctaDisabled: true,
      };
    }
    return {
      ctaLabel: strings('earn.no_accruing_bonus'),
      ctaDisabled: true,
    };
  }, [hasClaimable, hasBalance, claimableReward]);

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

  const handleLearnMorePress = useCallback(() => {
    Linking.openURL(AppConstants.URLS.MUSD_LEARN_MORE);
  }, []);

  const handleInfoPress = useCallback(() => {
    trackEvent(
      createEventBuilder(EVENT_NAME.TOOLTIP_OPENED)
        .addProperties({
          location: EVENT_LOCATIONS.ASSET_OVERVIEW,
          tooltip_name: 'your_bonus_info',
          related_text: 'Your bonus',
        })
        .build(),
    );

    openTooltipModal(
      strings('earn.your_bonus'),
      <Text variant={TextVariant.BodyMd}>
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
          {strings('earn.your_bonus_tooltip_your_bonus')}
        </Text>
        {strings('earn.your_bonus_tooltip_your_bonus_desc', {
          percentage: MUSD_CONVERSION_APY,
        })}
        <Text
          variant={TextVariant.BodyMd}
          onPress={handleTermsPress}
          twClassName="underline"
        >
          {strings('earn.musd_conversion.education.terms_apply')}
        </Text>
        {'\n\n'}
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
          {strings('earn.your_bonus_tooltip_annual_bonus')}
        </Text>
        {strings('earn.your_bonus_tooltip_annual_bonus_desc')}
        {'\n\n'}
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
          {strings('earn.your_bonus_tooltip_lifetime_bonus')}
        </Text>
        {strings('earn.your_bonus_tooltip_lifetime_bonus_desc')}
      </Text>,
      undefined,
      strings('earn.learn_more'),
      handleLearnMorePress,
    );
  }, [
    openTooltipModal,
    handleTermsPress,
    handleLearnMorePress,
    trackEvent,
    createEventBuilder,
  ]);

  const handleClaimPress = useCallback(() => {
    if (isClaimPressedRef.current || isLoading || ctaDisabled) return;
    isClaimPressedRef.current = true;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.MUSD_CLAIM_BONUS_BUTTON_CLICKED)
        .addProperties({
          location: EVENT_LOCATIONS.ASSET_OVERVIEW,
          action_type: 'claim_bonus',
          button_text: ctaLabel,
          network_chain_id: asset.chainId,
          network_name: network?.name,
          asset_symbol: asset.symbol,
        })
        .build(),
    );
    claimRewards();
  }, [
    isLoading,
    ctaDisabled,
    ctaLabel,
    trackEvent,
    createEventBuilder,
    asset.chainId,
    asset.symbol,
    network?.name,
    claimRewards,
  ]);

  return (
    <Box testID={ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CONTAINER}>
      {/* Top divider — full-width */}
      <Box twClassName="h-px bg-border-muted my-5" />

      {/* Content with horizontal padding */}
      <Box twClassName="px-4">
        {/* Header row: "Your bonus" + info icon | "3% bonus" tag */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="py-3"
          testID={ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.SECTION_HEADER}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1"
          >
            <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
              {strings('earn.your_bonus')}
            </Text>
            <ButtonIcon
              iconName={IconName.Info}
              size={ButtonIconSize.Sm}
              iconProps={{ color: IconColor.IconAlternative }}
              onPress={handleInfoPress}
              testID={ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.INFO_BUTTON}
            />
          </Box>
          <TagBase
            severity={TagSeverity.Success}
            testID={ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.BONUS_TAG}
          >
            {strings('earn.percentage_bonus', {
              percentage: String(MUSD_CONVERSION_APY),
            })}
          </TagBase>
        </Box>

        {/* Row 1: Estimated annual bonus */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="py-2"
          testID={ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.ANNUAL_BONUS_ROW}
        >
          <Text variant={TextVariant.BodyMd}>
            {strings('earn.estimated_annual_bonus')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            testID={ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.ANNUAL_BONUS_VALUE}
          >
            {formattedAnnualBonus}
          </Text>
        </Box>

        {/* Row 2: Lifetime bonus claimed */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="py-2"
          testID={ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.LIFETIME_ROW}
        >
          <Text variant={TextVariant.BodyMd}>
            {strings('earn.lifetime_bonus_claimed')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={
              hasLifetimeBonus
                ? TextColor.SuccessDefault
                : TextColor.TextDefault
            }
            testID={ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.LIFETIME_VALUE}
          >
            {formattedLifetimeBonus}
          </Text>
        </Box>

        {/* CTA Button */}
        <Button
          testID={ASSET_OVERVIEW_CLAIM_BONUS_TEST_IDS.CLAIM_BUTTON}
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          twClassName="w-full mt-4 mb-3"
          onPress={handleClaimPress}
          isDisabled={ctaDisabled || isLoading}
          isLoading={isLoading}
        >
          {ctaLabel}
        </Button>
      </Box>

      {/* Bottom divider — full-width */}
      <Box twClassName="h-px bg-border-muted my-5" />
    </Box>
  );
};

export default AssetOverviewClaimBonus;
