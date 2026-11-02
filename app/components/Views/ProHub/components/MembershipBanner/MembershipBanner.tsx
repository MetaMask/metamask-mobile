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
import type {
  MembershipAlertAction,
  MembershipBannerModel,
} from './MembershipBanner.utils';

interface MembershipBannerProps {
  testID?: string;
  model: MembershipBannerModel;
  onAction: (action: MembershipAlertAction) => void;
}

const MembershipBanner = ({
  testID = ProHubTestIds.MEMBERSHIP_BANNER,
  model,
  onAction,
}: MembershipBannerProps) => {
  const membershipAlert = model.alert;
  const alertAction = membershipAlert?.action;
  const alertActionKey = membershipAlert?.actionKey;
  const actionButton =
    alertAction && alertActionKey
      ? {
          actionButtonLabel: strings(alertActionKey),
          actionButtonOnPress: () => onAction(alertAction),
          actionButtonProps: {
            testID: ProHubTestIds.MEMBERSHIP_ALERT_ACTION(model.statusKind),
          },
        }
      : {};

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
        {model.iconColor ? (
          <Icon
            name={IconName.Info}
            size={IconSize.Lg}
            color={model.iconColor}
            accessibilityLabel={strings(model.statusKey)}
            testID={ProHubTestIds.MEMBERSHIP_STATUS_ICON}
          />
        ) : null}
      </Box>
      <Text
        variant={TextVariant.HeadingLg}
        color={TextColor.TextDefault}
        testID={ProHubTestIds.MEMBERSHIP_STATUS_LABEL}
      >
        {strings(model.statusKey)}
      </Text>
      {membershipAlert ? (
        <BannerAlert
          severity={membershipAlert.severity}
          startAccessory={null}
          title={strings(
            membershipAlert.titleKey,
            membershipAlert.descriptionValues ?? {},
          )}
          description={
            membershipAlert.descriptionKey
              ? strings(
                  membershipAlert.descriptionKey,
                  membershipAlert.descriptionValues ?? {},
                )
              : undefined
          }
          {...actionButton}
          twClassName="mt-3"
          testID={ProHubTestIds.MEMBERSHIP_ALERT_BANNER(model.statusKind)}
        />
      ) : null}
    </Card>
  );
};

export default MembershipBanner;
