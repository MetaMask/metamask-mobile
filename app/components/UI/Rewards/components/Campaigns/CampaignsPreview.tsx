import React, { useCallback, useMemo } from 'react';
import { Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Icon,
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
import RewardsErrorBanner from '../RewardsErrorBanner';
import type { CampaignDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import {
  getCampaignSortComparator,
  getCampaignStatus,
  isCampaignTypeSupported,
} from './CampaignTile.utils';

/**
 * CampaignsPreview shows featured campaigns on the dashboard.
 * Campaigns are ordered by status: active first, then upcoming, then past (complete).
 * Only campaigns marked as featured are displayed.
 */
const CampaignsPreview: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { campaigns, isLoading, hasError, hasLoaded, fetchCampaigns } =
    useRewardCampaigns();

  /**
   * Get featured campaigns ordered by status priority:
   * 1. Active campaigns (sorted by start date ascending)
   * 2. Upcoming campaigns (sorted by start date ascending)
   * 3. Past/complete campaigns (sorted by end date descending - most recent first)
   */
  const featuredCampaigns = useMemo((): CampaignDto[] => {
    const featured = (campaigns ?? []).filter((c) => c.featured);

    const active: CampaignDto[] = [];
    const upcoming: CampaignDto[] = [];
    const past: CampaignDto[] = [];

    featured.forEach((campaign) => {
      const status = getCampaignStatus(campaign);
      switch (status) {
        case 'active':
          active.push(campaign);
          break;
        case 'upcoming':
          upcoming.push(campaign);
          break;
        case 'complete':
          past.push(campaign);
          break;
      }
    });

    active.sort(getCampaignSortComparator('active'));
    upcoming.sort(getCampaignSortComparator('upcoming'));
    past.sort(getCampaignSortComparator('complete'));

    return [...active, ...upcoming, ...past];
  }, [campaigns]);

  const hasFeaturedCampaigns = featuredCampaigns.length > 0;

  const handleNavigateToCampaigns = useCallback(() => {
    navigation.navigate(Routes.CAMPAIGNS_VIEW);
  }, [navigation]);

  return (
    <Box
      twClassName="gap-3 p-4"
      testID={REWARDS_VIEW_SELECTORS.CAMPAIGNS_PREVIEW}
    >
      <Pressable onPress={handleNavigateToCampaigns}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2"
        >
          {(isLoading || !hasLoaded) && !hasFeaturedCampaigns && (
            <ActivityIndicator size="small" color={colors.primary.default} />
          )}
          <Text variant={TextVariant.HeadingMd}>
            {strings('rewards.campaigns_preview.title')}
          </Text>
          <Icon name={IconName.ArrowRight} size={IconSize.Md} />
        </Box>
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

      {featuredCampaigns.map((campaign) => (
        <CampaignTile
          key={campaign.id}
          campaign={campaign}
          isInteractive={isCampaignTypeSupported(campaign.type)}
        />
      ))}
    </Box>
  );
};

export default CampaignsPreview;
