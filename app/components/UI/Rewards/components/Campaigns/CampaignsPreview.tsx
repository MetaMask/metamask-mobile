import React, { useCallback, useMemo } from 'react';
import { Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useTheme } from '../../../../../util/theme';
import {
  Box,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
  Skeleton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../../constants/navigation/Routes';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import { strings } from '../../../../../../locales/i18n';
import { useRewardCampaigns } from '../../hooks/useRewardCampaigns';
import CampaignTile from './CampaignTile';
import CampaignReminder from './CampaignReminder';
import RewardsErrorBanner from '../RewardsErrorBanner';
import {
  CampaignType,
  type CampaignDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { getCampaignStatus } from './CampaignTile.utils';
import { navigateToRewardsRoute } from '../../utils';
import {
  buildMoneyAccountSweepstakesTileCampaign,
  getMoneyAccountSweepstakesSeries,
} from '../../utils/moneyAccountSweepstakesSeries';

/**
 * Collapse MONEY_ACCOUNT_SWEEPSTAKES into one series tile (same as CampaignsView),
 * then return featured campaigns for the dashboard preview.
 */
export function getFeaturedPreviewCampaigns(
  campaigns: CampaignDto[],
): CampaignDto[] {
  const series = getMoneyAccountSweepstakesSeries(campaigns);
  const seriesTile = buildMoneyAccountSweepstakesTileCampaign(series);
  const anyMasFeatured = series.campaigns.some((c) => c.featured);
  let seriesPlaced = false;
  const collapsed: CampaignDto[] = [];

  for (const campaign of campaigns) {
    if (campaign.type === CampaignType.MONEY_ACCOUNT_SWEEPSTAKES) {
      if (!seriesPlaced && seriesTile && anyMasFeatured) {
        seriesPlaced = true;
        collapsed.push({ ...seriesTile, featured: true });
      }
      continue;
    }
    collapsed.push(campaign);
  }

  return collapsed.filter((c) => c.featured);
}

/**
 * CampaignsPreview shows featured campaigns on the dashboard.
 * All campaigns marked `featured` are displayed, in API order. Upcoming campaigns
 * use {@link CampaignReminder}; active or complete campaigns use {@link CampaignTile}.
 * Consecutive MONEY_ACCOUNT_SWEEPSTAKES campaigns collapse to a single tile.
 */
const CampaignsPreview: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { colors } = useTheme();
  const { campaigns, isLoading, hasError, hasLoaded, fetchCampaigns } =
    useRewardCampaigns();

  const featuredCampaigns = useMemo(
    (): CampaignDto[] => getFeaturedPreviewCampaigns(campaigns ?? []),
    [campaigns],
  );

  const hasFeaturedCampaigns = featuredCampaigns.length > 0;

  const handleNavigateToCampaigns = useCallback(() => {
    navigateToRewardsRoute(navigation, Routes.REWARDS_CAMPAIGNS_VIEW);
  }, [navigation]);

  return (
    <Box
      twClassName="gap-3 p-4"
      testID={REWARDS_VIEW_SELECTORS.CAMPAIGNS_PREVIEW}
    >
      <Pressable
        onPress={handleNavigateToCampaigns}
        style={tw.style('flex-row items-center gap-1')}
      >
        {(isLoading || !hasLoaded) && !hasFeaturedCampaigns && (
          <ActivityIndicator size="small" color={colors.primary.default} />
        )}
        <Text variant={TextVariant.HeadingMd}>
          {strings('rewards.campaigns_preview.title')}
        </Text>
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Md}
          color={IconColor.IconAlternative}
        />
      </Pressable>

      {(isLoading || !hasLoaded) && !hasFeaturedCampaigns && (
        <Skeleton style={tw.style('h-50 rounded-xl')} />
      )}

      {!isLoading && hasLoaded && hasError && !hasFeaturedCampaigns && (
        <RewardsErrorBanner
          title={strings('rewards.campaigns_view.error_title')}
          description={strings('rewards.campaigns_view.error_description')}
          onConfirm={fetchCampaigns}
          confirmButtonLabel={strings('rewards.campaigns_view.retry_button')}
        />
      )}

      {featuredCampaigns.map((campaign) =>
        getCampaignStatus(campaign) === 'upcoming' ? (
          <CampaignReminder key={campaign.id} campaign={campaign} />
        ) : (
          <CampaignTile key={campaign.id} campaign={campaign} />
        ),
      )}
    </Box>
  );
};

export default CampaignsPreview;
