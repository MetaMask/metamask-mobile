import React, { useCallback, useMemo } from 'react';
import { Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  FontWeight,
  Button,
  ButtonVariant,
  ButtonSize,
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
 * CampaignsPreview shows a snapshot of campaigns on the dashboard:
 * the first active campaign as a tile and the first upcoming campaign
 * as a compact banner with "Coming soon".
 */
const CampaignsPreview: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { categorizedCampaigns, isLoading, hasError, fetchCampaigns } =
    useRewardCampaigns();

  const activeCampaign = useMemo(
    () => categorizedCampaigns.active[0] ?? null,
    [categorizedCampaigns.active],
  );

  const upcomingCampaign = useMemo(
    () => categorizedCampaigns.upcoming[0] ?? null,
    [categorizedCampaigns.upcoming],
  );

  const handleNavigateToCampaigns = useCallback(() => {
    navigation.navigate(Routes.CAMPAIGNS_VIEW);
  }, [navigation]);

  if (!isLoading && !hasError && !activeCampaign && !upcomingCampaign) {
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
          {isLoading && !activeCampaign && !upcomingCampaign && (
            <ActivityIndicator size="small" color={colors.primary.default} />
          )}
          <Text variant={TextVariant.HeadingMd}>
            {strings('rewards.campaigns_preview.title')}
          </Text>
          <Icon name={IconName.ArrowRight} size={IconSize.Md} />
        </Box>
      </Pressable>

      {isLoading && !activeCampaign && !upcomingCampaign && (
        <Skeleton style={tw.style('h-50 rounded-xl')} />
      )}

      {!isLoading && hasError && !activeCampaign && !upcomingCampaign && (
        <RewardsErrorBanner
          title={strings('rewards.campaigns_view.error_title')}
          description={strings('rewards.campaigns_view.error_description')}
          onConfirm={fetchCampaigns}
          confirmButtonLabel={strings('rewards.campaigns_view.retry_button')}
        />
      )}

      {activeCampaign && <CampaignTile campaign={activeCampaign} />}

      {upcomingCampaign && (
        <Pressable
          style={({ pressed }) =>
            tw.style('rounded-xl bg-muted px-4 py-3', pressed && 'opacity-70')
          }
          testID={REWARDS_VIEW_SELECTORS.CAMPAIGNS_PREVIEW_UPCOMING_BANNER}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
          >
            <Box twClassName="flex-1">
              <Text variant={TextVariant.BodySm} twClassName="text-alternative">
                {strings('rewards.campaigns_preview.coming_soon')}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                twClassName="text-default"
                numberOfLines={1}
              >
                {upcomingCampaign.name}
              </Text>
            </Box>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              startIconName={IconName.Notification}
              onPress={() => {
                // TODO: implement notification opt-in
              }}
            >
              {strings('rewards.campaigns_preview.notify_me')}
            </Button>
          </Box>
        </Pressable>
      )}
    </Box>
  );
};

export default CampaignsPreview;
