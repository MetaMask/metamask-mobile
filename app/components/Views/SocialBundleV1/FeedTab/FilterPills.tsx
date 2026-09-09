import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  IconName,
  Text,
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import type { FeedAudience } from './mocks/types';

interface FilterPillsProps {
  audience: FeedAudience;
  onChange: (next: FeedAudience) => void;
}

const AUDIENCE_LABEL: Record<FeedAudience, string> = {
  trending: 'Trending',
  following: 'Following',
};

const Pill: React.FC<{
  label: string;
  isActive: boolean;
  onPress: () => void;
}> = ({ label, isActive, onPress }) => {
  const tw = useTailwind();
  return (
    <Pressable onPress={onPress}>
      <Box
        style={tw.style(
          `rounded-full px-4 py-2 ${
            isActive ? 'bg-background-default' : 'bg-background-alternative'
          }`,
        )}
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={isActive ? TextColor.TextDefault : TextColor.TextAlternative}
        >
          {label}
        </Text>
      </Box>
    </Pressable>
  );
};

/**
 * "Trending" / "Following" pill toggle with a trailing filter icon (no-op).
 * Toggling the audience swaps the mock feed source — see `FeedTab`.
 */
const FilterPills: React.FC<FilterPillsProps> = ({ audience, onChange }) => {
  const tw = useTailwind();
  const noop = useCallback(() => undefined, []);
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      style={tw.style('gap-2 px-4 pt-2 pb-3 bg-background-muted')}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        style={tw.style('flex-1 gap-2')}
      >
        <Pill
          label={AUDIENCE_LABEL.trending}
          isActive={audience === 'trending'}
          onPress={() => onChange('trending')}
        />
        <Pill
          label={AUDIENCE_LABEL.following}
          isActive={audience === 'following'}
          onPress={() => onChange('following')}
        />
      </Box>
      <ButtonIcon
        iconName={IconName.Filter}
        size={ButtonIconSize.Md}
        variant={ButtonIconVariant.Secondary}
        onPress={noop}
      />
    </Box>
  );
};

export default FilterPills;
