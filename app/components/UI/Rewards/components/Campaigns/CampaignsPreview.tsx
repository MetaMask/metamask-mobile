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

/**
 * CampaignsPreview shows a single featured campaign on the dashboard.
 * Priority: first active (soonest start date) → first upcoming (soonest start date) → most recent previous (latest end date).
 */
const CampaignsPreview: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { categorizedCampaigns, isLoading, hasError, fetchCampaigns } =
    useRewardCampaigns();

  // Priority: first active (soonest start) → first upcoming (soonest start) → most recent previous (latest end)
  const featuredCampaign = useMemo(
    () =>
      categorizedCampaigns.active[0] ??
      categorizedCampaigns.upcoming[0] ??
      categorizedCampaigns.previous[0] ??
      null,
    [categorizedCampaigns],
  );

  const handleNavigateToCampaigns = useCallback(() => {
    navigation.navigate(Routes.CAMPAIGNS_VIEW);
  }, [navigation]);

  if (!isLoading && !hasError && !featuredCampaign) {
    return null;
  }

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
          {isLoading && !featuredCampaign && (
            <ActivityIndicator size="small" color={colors.primary.default} />
          )}
          <Text variant={TextVariant.HeadingMd}>
            {strings('rewards.campaigns_preview.title')}
          </Text>
          <Icon name={IconName.ArrowRight} size={IconSize.Md} />
        </Box>
      </Pressable>

      {isLoading && !featuredCampaign && (
        <Skeleton style={tw.style('h-50 rounded-xl')} />
      )}

      {!isLoading && hasError && !featuredCampaign && (
        <RewardsErrorBanner
          title={strings('rewards.campaigns_view.error_title')}
          description={strings('rewards.campaigns_view.error_description')}
          onConfirm={fetchCampaigns}
          confirmButtonLabel={strings('rewards.campaigns_view.retry_button')}
        />
      )}

      {featuredCampaign && <CampaignTile campaign={featuredCampaign} />}
    </Box>
  );
};

export default CampaignsPreview;
