import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconName,
  IconSize,
  Skeleton,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  useNavigation,
  type NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import { useGetOndoCampaignActivity } from '../../hooks/useGetOndoCampaignActivity';
import OndoActivityRow from './OndoActivityRow';
import RewardsErrorBanner from '../RewardsErrorBanner';
import RewardsInfoBanner from '../RewardsInfoBanner';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';

const MAX_PREVIEW_ROWS = 3;

export const ONDO_ACTIVITY_PREVIEW_TEST_IDS = {
  CONTAINER: 'ondo-activity-preview-container',
  LOADING: 'ondo-activity-preview-loading',
  ERROR: 'ondo-activity-preview-error',
  EMPTY: 'ondo-activity-preview-empty',
} as const;

interface OndoActivityPreviewProps {
  campaignId: string;
}

const OndoActivityPreview: React.FC<OndoActivityPreviewProps> = ({
  campaignId,
}) => {
  const tw = useTailwind();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { activityEntries, isLoading, error, refresh } =
    useGetOndoCampaignActivity(campaignId);

  const previewEntries = activityEntries?.slice(0, MAX_PREVIEW_ROWS) ?? [];
  const hasEntries = previewEntries.length > 0;

  const navigateToFullView = () => {
    navigation.navigate(Routes.REWARDS_ONDO_CAMPAIGN_ACTIVITY_VIEW, {
      campaignId,
    });
  };

  if (isLoading) {
    return (
      <Box testID={ONDO_ACTIVITY_PREVIEW_TEST_IDS.LOADING} twClassName="gap-3">
        <Text variant={TextVariant.HeadingMd}>
          {strings('rewards.ondo_campaign_activity.title')}
        </Text>
        {Array.from({ length: MAX_PREVIEW_ROWS }).map((_, i) => (
          <Skeleton key={i} style={tw.style('h-12 rounded-lg')} />
        ))}
      </Box>
    );
  }

  if (error && !hasEntries) {
    return (
      <Box testID={ONDO_ACTIVITY_PREVIEW_TEST_IDS.ERROR}>
        <Text variant={TextVariant.HeadingMd} twClassName="mb-3">
          {strings('rewards.ondo_campaign_activity.title')}
        </Text>
        <RewardsErrorBanner
          title={strings('rewards.ondo_campaign_activity.error_title')}
          description={strings(
            'rewards.ondo_campaign_activity.error_description',
          )}
          onConfirm={refresh}
          confirmButtonLabel={strings(
            'rewards.ondo_campaign_activity.retry_button',
          )}
        />
      </Box>
    );
  }

  if (!hasEntries) {
    return (
      <Box testID={ONDO_ACTIVITY_PREVIEW_TEST_IDS.EMPTY}>
        <Text variant={TextVariant.HeadingMd} twClassName="mb-3">
          {strings('rewards.ondo_campaign_activity.title')}
        </Text>
        <RewardsInfoBanner
          title={strings('rewards.ondo_campaign_activity.empty_title')}
          description={strings(
            'rewards.ondo_campaign_activity.empty_description',
          )}
        />
      </Box>
    );
  }

  return (
    <Box testID={ONDO_ACTIVITY_PREVIEW_TEST_IDS.CONTAINER}>
      <Pressable onPress={navigateToFullView}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="mb-2"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2"
          >
            <Text variant={TextVariant.HeadingMd}>
              {strings('rewards.ondo_campaign_activity.title')}
            </Text>
            <Icon name={IconName.ArrowRight} size={IconSize.Md} />
          </Box>
        </Box>
      </Pressable>

      {previewEntries.map((entry, index) => (
        <OndoActivityRow
          key={`${entry.timestamp}-${index}`}
          entry={entry}
          testID={`ondo-activity-preview-row-${index}`}
        />
      ))}
    </Box>
  );
};

export default OndoActivityPreview;
