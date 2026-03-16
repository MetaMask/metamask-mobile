import React from 'react';
import { View, Image } from 'react-native';
import { useSelector } from 'react-redux';
import ProgressBar from 'react-native-progress/Bar';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import {
  selectCampaignProgress,
  selectCampaignDaysLeft,
  selectCampaignActivityType,
} from '../../../../../reducers/rewards/selectors';
import { strings } from '../../../../../../locales/i18n';

interface CampaignActivityItemProps {
  campaignId: string;
  /** Asset ticker symbol, e.g. "ONDO" */
  assetSymbol: string;
  /** USD value string, e.g. "$3,750" */
  usdValue: string;
  /** Share count label, e.g. "8.23 shares" */
  sharesLabel: string;
  /** Asset icon URI */
  assetIconUrl?: string;
}

/**
 * CampaignActivityItem displays a holding asset with campaign progress.
 * Shows asset icon, ticker, value, progress bar, activity type and days left.
 * Asset data is passed as props; campaign progress/timing comes from the Redux store.
 */
const CampaignActivityItem: React.FC<CampaignActivityItemProps> = ({
  campaignId,
  assetSymbol,
  usdValue,
  sharesLabel,
  assetIconUrl,
}) => {
  const tw = useTailwind();
  const theme = useTheme();

  const progress = useSelector(selectCampaignProgress(campaignId));
  const daysLeft = useSelector(selectCampaignDaysLeft(campaignId));
  const activityType = useSelector(selectCampaignActivityType(campaignId));

  const progressValue = progress ?? 0;

  return (
    <Box twClassName="py-3" testID={`campaign-activity-item-${campaignId}`}>
      {/* Asset row */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.SpaceBetween}
        twClassName="mb-2"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-3"
        >
          {/* Asset icon */}
          {assetIconUrl ? (
            <Image
              source={{ uri: assetIconUrl }}
              style={tw.style('w-10 h-10 rounded-full')}
              testID="campaign-activity-item-icon"
            />
          ) : (
            <View
              style={[
                tw.style('w-10 h-10 rounded-full items-center justify-center'),
                { backgroundColor: theme.colors.primary.muted },
              ]}
              testID="campaign-activity-item-icon-fallback"
            >
              <Text
                variant={TextVariant.BodySmBold}
                color={TextColor.Primary}
                fontWeight={FontWeight.Bold}
              >
                {assetSymbol.slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}

          {/* Ticker and shares */}
          <Box flexDirection={BoxFlexDirection.Column}>
            <Text
              variant={TextVariant.BodyMdBold}
              fontWeight={FontWeight.Bold}
              testID="campaign-activity-item-symbol"
            >
              {assetSymbol}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.Alternative}
              testID="campaign-activity-item-shares"
            >
              {sharesLabel}
            </Text>
          </Box>
        </Box>

        {/* USD value */}
        <Text
          variant={TextVariant.BodyMdBold}
          fontWeight={FontWeight.Bold}
          testID="campaign-activity-item-usd-value"
        >
          {usdValue}
        </Text>
      </Box>

      {/* Progress bar */}
      <View twClassName="mb-2" testID="campaign-activity-item-progress-bar">
        <ProgressBar
          progress={progressValue}
          width={null as unknown as number}
          color={theme.colors.success.default}
          height={6}
          borderRadius={3}
          borderWidth={0}
          unfilledColor={theme.colors.border.muted}
        />
      </View>

      {/* Activity type and days left */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.SpaceBetween}
        alignItems={BoxAlignItems.Center}
      >
        {activityType ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.SuccessDefault}
            fontWeight={FontWeight.Medium}
            testID="campaign-activity-item-activity-type"
          >
            {activityType}
          </Text>
        ) : (
          <View />
        )}

        {daysLeft != null && daysLeft > 0 ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.SuccessDefault}
            fontWeight={FontWeight.Medium}
            testID="campaign-activity-item-days-left"
          >
            {strings('rewards.campaign.days_left', { count: String(daysLeft) })}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
};

export default CampaignActivityItem;
