import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';

export interface WhatsHappeningAIGeneratedLabelProps {
  onInfoPress: () => void;
  /** Optional Tailwind classes for the outer row (e.g. justify-center, spacing). */
  twClassName?: string;
  testID?: string;
}

const WhatsHappeningAIGeneratedLabel: React.FC<
  WhatsHappeningAIGeneratedLabelProps
> = ({
  onInfoPress,
  twClassName,
  testID = 'whats-happening-ai-disclaimer-button',
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    gap={1}
    twClassName={twClassName}
  >
    <Icon
      name={IconName.Sparkle}
      size={IconSize.Sm}
      color={IconColor.IconAlternative}
    />
    <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
      {strings('whats_happening.ai_generated')}
    </Text>
    <ButtonIcon
      iconName={IconName.Info}
      size={ButtonIconSize.Sm}
      iconProps={{
        color: IconColor.IconAlternative,
        size: IconSize.Sm,
      }}
      onPress={onInfoPress}
      accessibilityLabel={strings('market_insights.disclaimer_modal.title')}
      testID={testID}
    />
  </Box>
);

export default WhatsHappeningAIGeneratedLabel;
