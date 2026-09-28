import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Card,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  BannerAlert,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { ProHubTestIds } from '../../ProHub.testIds';
import type { MembershipBannerState } from '../../ProHub.constants';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Formats a membership due date as `MM/DD/YYYY`. */
export const formatMembershipDueDate = (value: string): string => {
  const isoMatch = ISO_DATE.exec(value);
  if (isoMatch) {
    return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${month}/${day}/${parsed.getFullYear()}`;
};

interface MembershipBannerProps {
  testID?: string;
  state: MembershipBannerState;
  addFundsDueDate: string;
  onAction: () => void;
}

const MembershipBanner = ({
  testID = ProHubTestIds.MEMBERSHIP_BANNER,
  state,
  addFundsDueDate,
  onAction,
}: MembershipBannerProps) => {
  const dateInterpolation = state.interpolatesDate
    ? { date: formatMembershipDueDate(addFundsDueDate) }
    : undefined;
  const alertTitle = dateInterpolation
    ? strings(state.titleKey, dateInterpolation)
    : strings(state.titleKey);
  const alertDescription = dateInterpolation
    ? strings(state.descriptionKey, dateInterpolation)
    : strings(state.descriptionKey);

  return (
    <Card
      twClassName="w-full bg-background-section rounded-xl p-4 border-0"
      testID={testID}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('pro_hub.title')}
        </Text>
        <Icon
          name={IconName.Info}
          size={IconSize.Lg}
          color={state.iconColor}
          testID={ProHubTestIds.MEMBERSHIP_STATUS_ICON}
        />
      </Box>
      <Text
        variant={TextVariant.HeadingLg}
        color={TextColor.TextDefault}
        testID={ProHubTestIds.MEMBERSHIP_STATUS_LABEL}
      >
        {strings(state.statusKey)}
      </Text>
      <BannerAlert
        severity={state.bannerSeverity}
        startAccessory={null}
        title={alertTitle}
        description={alertDescription}
        actionButtonLabel={strings(state.actionKey)}
        actionButtonOnPress={onAction}
        actionButtonProps={{ testID: ProHubTestIds.MEMBERSHIP_ALERT_ACTION }}
        twClassName="mt-3"
        testID={ProHubTestIds.MEMBERSHIP_ALERT_BANNER}
      />
    </Card>
  );
};

export default MembershipBanner;
