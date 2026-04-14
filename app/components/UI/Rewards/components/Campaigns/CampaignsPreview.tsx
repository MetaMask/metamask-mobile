import React, { useCallback, useMemo } from 'react';
import { Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
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
import RewardsErrorBanner from '../RewardsErrorBanner';
import type { CampaignDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

/**
 * CampaignsPreview shows featured campaigns on the dashboard.
 * Only campaigns marked as featured are displayed, in the order returned by the API.
 */
const CampaignsPreview: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { campaigns, isLoading, hasError, hasLoaded, fetchCampaigns } =
    useRewardCampaigns();

  const featuredCampaign = useMemo(
    (): CampaignDto | undefined => (campaigns ?? []).find((c) => c.featured),
    [campaigns],
  );

  const hasFeaturedCampaigns = Boolean(featuredCampaign);

  const handleNavigateToCampaigns = useCallback(() => {
    navigation.navigate(Routes.REWARDS_CAMPAIGNS_VIEW);
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
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Md}
            color={IconColor.IconAlternative}
          />
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

      {featuredCampaign && <CampaignTile campaign={featuredCampaign} />}
    </Box>
  );
};

export default CampaignsPreview;
