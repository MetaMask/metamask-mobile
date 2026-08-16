import React from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import NotificationIcon from '../../../../../images/rewards/notification.svg';
import {
  CampaignType,
  type CampaignDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { isCampaignTypeSupported } from './CampaignTile.utils';
import { useCampaignReminderActions } from '../../hooks/useCampaignReminderActions';
import { navigateToRewardsRoute } from '../../utils';

interface CampaignReminderProps {
  campaign: CampaignDto;
}

/**
 * Compact preview row for an upcoming featured campaign: label, name, and
 * the same reminder flow as {@link CampaignTile}.
 */
const CampaignReminder: React.FC<CampaignReminderProps> = ({ campaign }) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
  const reminderEnabled = isCampaignTypeSupported(campaign.type);
  const { showRemindMeCta, handleRemindMePress } = useCampaignReminderActions(
    campaign,
    reminderEnabled,
  );

  const handleViewDetails = () => {
    if (campaign.type === CampaignType.MONEY_ACCOUNT_SWEEPSTAKES) {
      navigateToRewardsRoute(
        navigation,
        Routes.REWARDS_MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_DETAILS_VIEW,
        { campaignId: campaign.id },
      );
    }
  };

  const canPreview = campaign.type === CampaignType.MONEY_ACCOUNT_SWEEPSTAKES;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="rounded-xl bg-muted p-4 gap-3"
      testID={`campaign-reminder-${campaign.id}`}
    >
      <Pressable
        onPress={handleViewDetails}
        disabled={!canPreview}
        accessibilityRole={canPreview ? 'button' : undefined}
        accessibilityLabel={
          canPreview
            ? strings('rewards.campaign.view_details_accessibility', {
                campaignName: campaign.name,
              })
            : undefined
        }
        testID={`campaign-reminder-details-${campaign.id}`}
        style={({ pressed }) =>
          tw.style(
            'min-w-0 flex-1 shrink gap-0.5',
            pressed && canPreview && 'opacity-70',
          )
        }
      >
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          fontWeight={FontWeight.Medium}
        >
          {strings('rewards.campaign.up_next')}
        </Text>
        <Text
          variant={TextVariant.HeadingSm}
          color={TextColor.TextDefault}
          fontWeight={FontWeight.Medium}
          numberOfLines={2}
        >
          {campaign.name}
        </Text>
        {canPreview && (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1 pt-1"
          >
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.PrimaryDefault}
              fontWeight={FontWeight.Medium}
            >
              {strings('rewards.campaign.view_details')}
            </Text>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Sm}
              color={IconColor.PrimaryDefault}
            />
          </Box>
        )}
      </Pressable>
      {showRemindMeCta && (
        <Pressable
          onPress={() => {
            handleRemindMePress().catch(() => undefined);
          }}
          testID={`campaign-reminder-notify-${campaign.id}`}
          accessibilityRole="button"
          accessibilityLabel={strings('rewards.campaign.notify_me')}
          style={({ pressed }) =>
            tw.style(
              'flex-row items-center gap-1.5 rounded-lg px-4 py-3 bg-background-muted',
              pressed && 'opacity-70',
            )
          }
        >
          <NotificationIcon
            name="notification"
            width={20}
            height={20}
            color={colors.icon.default}
          />
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextDefault}
            fontWeight={FontWeight.Medium}
          >
            {strings('rewards.campaign.notify_me')}
          </Text>
        </Pressable>
      )}
    </Box>
  );
};

export default CampaignReminder;
