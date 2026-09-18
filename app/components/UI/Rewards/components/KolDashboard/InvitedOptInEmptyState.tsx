import React from 'react';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  ButtonSize,
  ButtonVariant,
  IconColor,
  IconName,
  SectionDivider,
  TabEmptyState,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';

interface InvitedOptInEmptyStateProps {
  onOptIn: () => void;
}

/**
 * UI-only state for an invited user who has not opted any accounts into
 * Rewards. Engineers can connect the CTA to the account opt-in flow later.
 */
const InvitedOptInEmptyState: React.FC<InvitedOptInEmptyStateProps> = ({
  onOptIn,
}) => (
  <Box testID={KOL_DASHBOARD_SELECTORS.INVITED_OPT_IN_SECTION}>
    <SectionDivider marginVertical={0} twClassName="mt-8 mb-8" />
    <TabEmptyState
      icon={
        <AvatarIcon
          iconName={IconName.Gift}
          size={AvatarIconSize.Xl}
          severity={AvatarIconSeverity.Neutral}
          iconProps={{ color: IconColor.IconDefault }}
          testID={KOL_DASHBOARD_SELECTORS.INVITED_OPT_IN_ICON}
        />
      }
      description={strings('rewards.kol.invited_opt_in_description')}
      descriptionProps={{
        variant: TextVariant.BodyMd,
        color: TextColor.TextAlternative,
      }}
      actionButtonText={strings('rewards.kol.invited_opt_in_action')}
      actionButtonProps={{
        variant: ButtonVariant.Primary,
        size: ButtonSize.Lg,
        twClassName: 'mt-3 self-stretch',
        testID: KOL_DASHBOARD_SELECTORS.INVITED_OPT_IN_BUTTON,
      }}
      onAction={onOptIn}
      twClassName="mx-auto px-4"
    />
    <Text
      variant={TextVariant.BodyXs}
      color={TextColor.TextAlternative}
      twClassName="px-4 pb-8 pt-6 text-center"
    >
      {strings('rewards.kol.invited_opt_in_legal')}
    </Text>
  </Box>
);

export default InvitedOptInEmptyState;
