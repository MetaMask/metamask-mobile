import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { getSocialFeedPostSkeletonTestId } from './SocialFeedPostSkeleton.testIds';
import { SocialFeedSkeletonPlaceholder } from './SocialFeedSkeletonPlaceholder';

export interface SocialFeedPostSkeletonProps {
  index: number;
}

const Item = SkeletonPlaceholder.Item;

const AVATAR_BONE = { width: 32, height: 32, borderRadius: 16 } as const;

const AUTHOR_NAME_BONE = { width: 112, height: 16, borderRadius: 4 } as const;
const AUTHOR_BADGE_BONE = {
  width: 64,
  height: 20,
  borderRadius: 9999,
} as const;
const TIMESTAMP_BONE = { width: 32, height: 12, borderRadius: 4 } as const;

const CARD_SYMBOL_BONE = { width: 80, height: 16, borderRadius: 4 } as const;
const CARD_SUBTITLE_BONE = { width: 48, height: 12, borderRadius: 4 } as const;
const CARD_VALUE_BONE = { width: 96, height: 20, borderRadius: 4 } as const;
const CARD_PNL_BONE = { width: 56, height: 12, borderRadius: 4 } as const;

const PAIR_BONES = [
  { width: 80, height: 12, borderRadius: 4 },
  { width: 64, height: 12, borderRadius: 4 },
] as const;

const REACTION_BONES = [
  { width: 40, height: 16, borderRadius: 4 },
  { width: 40, height: 16, borderRadius: 4 },
] as const;

const renderAvatarLeadRow = (trailing: React.ReactNode) => (
  <Item flexDirection="row" alignItems="center" gap={8} flex={1}>
    <Item {...AVATAR_BONE} />
    {trailing}
  </Item>
);

const renderPairedBones = (
  bones: readonly {
    width: number;
    height: number;
    borderRadius?: number;
  }[],
  keyPrefix: string,
) =>
  bones.map((bone, index) => <Item key={`${keyPrefix}-${index}`} {...bone} />);

/**
 * Loading placeholder matching {@link SocialFeedPostShell}: author row,
 * position card, and reaction affordances.
 *
 * Uses `SkeletonPlaceholder.Item` (not custom components) so the shimmer mask
 * receives layout styles and Sonar duplication stays low.
 */
const SocialFeedPostSkeleton: React.FC<SocialFeedPostSkeletonProps> = ({
  index,
}) => {
  const tw = useTailwind();
  const cardChromeStyle = tw.style(
    'rounded-2xl border border-muted p-4 gap-3 bg-background-alternative',
  ) as Record<string, unknown>;
  const dividerStyle = tw.style('bg-border-muted') as Record<string, unknown>;

  return (
    <View
      style={tw.style('gap-3')}
      testID={getSocialFeedPostSkeletonTestId(index)}
    >
      <SocialFeedSkeletonPlaceholder>
        <Item gap={12}>
          <Item
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
          >
            {renderAvatarLeadRow(
              <>
                <Item {...AUTHOR_NAME_BONE} />
                <Item {...AUTHOR_BADGE_BONE} />
              </>,
            )}
            <Item {...TIMESTAMP_BONE} />
          </Item>

          <Item {...cardChromeStyle} gap={12}>
            <Item
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
            >
              {renderAvatarLeadRow(
                <Item gap={6}>
                  <Item {...CARD_SYMBOL_BONE} />
                  <Item {...CARD_SUBTITLE_BONE} />
                </Item>,
              )}
              <Item alignItems="flex-end" gap={6}>
                <Item {...CARD_VALUE_BONE} />
                <Item {...CARD_PNL_BONE} />
              </Item>
            </Item>
            <Item height={1} {...dividerStyle} />
            <Item flexDirection="row" justifyContent="space-between">
              {renderPairedBones(PAIR_BONES, 'card-stat')}
            </Item>
            <Item width="100%" height={40} borderRadius={9999} />
          </Item>

          <Item flexDirection="row" alignItems="center" gap={16}>
            {renderPairedBones(REACTION_BONES, 'reaction')}
          </Item>
        </Item>
      </SocialFeedSkeletonPlaceholder>
    </View>
  );
};

export default SocialFeedPostSkeleton;
