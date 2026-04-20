import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

export interface OndoCampaignWinningViewProps {
  campaignName: string;
  onDismiss: () => void;
}

const OndoCampaignWinningView: React.FC<OndoCampaignWinningViewProps> = ({
  campaignName,
  onDismiss,
}) => (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Start}
      justifyContent={BoxJustifyContent.Between}
      twClassName="mx-4 mt-4 rounded-xl bg-muted p-4 gap-3"
    >
      <Box twClassName="flex-1 gap-1 pr-2">
        <Text variant={TextVariant.BodyMd}>
          {strings('rewards.ondo_winning_banner.title', { campaignName })}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('rewards.ondo_winning_banner.description')}
        </Text>
      </Box>
      <ButtonIcon
        iconName={IconName.Close}
        size={ButtonIconSize.Sm}
        onPress={onDismiss}
        accessibilityLabel={strings('rewards.ondo_winning_banner.dismiss_a11y')}
        twClassName="shrink-0"
      />
    </Box>
  );

export default OndoCampaignWinningView;
