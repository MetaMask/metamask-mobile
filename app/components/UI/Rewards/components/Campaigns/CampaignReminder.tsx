import React from 'react';
import { Pressable } from 'react-native';
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
import NotificationIcon from '../../../../../images/rewards/notification.svg';
import type { CampaignDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import { isCampaignTypeSupported } from './CampaignTile.utils';
import { useCampaignReminderActions } from '../../hooks/useCampaignReminderActions';

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
  const reminderEnabled = isCampaignTypeSupported(campaign.type);
  const { showRemindMeCta, handleRemindMePress } = useCampaignReminderActions(
    campaign,
    reminderEnabled,
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="rounded-xl bg-muted p-4 gap-3"
      testID={`campaign-reminder-${campaign.id}`}
    >
      <Box
        flexDirection={BoxFlexDirection.Column}
        twClassName="min-w-0 flex-1 shrink gap-0.5"
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
      </Box>
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
