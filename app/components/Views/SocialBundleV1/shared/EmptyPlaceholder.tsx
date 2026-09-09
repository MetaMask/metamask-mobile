import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  IconName,
  Icon,
  IconSize,
  IconColor,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';

interface EmptyPlaceholderProps {
  label: string;
  hint?: string;
}

/**
 * Bare "coming soon" placeholder used by the Live trades and Leaderboard tabs
 * in the prototype. Kept intentionally spartan — this PR only ships the Feed
 * tab; the other tabs get real content in follow-ups.
 */
const EmptyPlaceholder: React.FC<EmptyPlaceholderProps> = ({ label, hint }) => {
  const tw = useTailwind();
  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      style={tw.style('flex-1 px-6 gap-2')}
    >
      <Icon
        name={IconName.Clock}
        size={IconSize.Xl}
        color={IconColor.IconMuted}
      />
      <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
        {label}
      </Text>
      {hint ? (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          style={tw.style('text-center')}
        >
          {hint}
        </Text>
      ) : null}
    </Box>
  );
};

export default EmptyPlaceholder;
