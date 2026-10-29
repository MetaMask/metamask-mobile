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

/** Matches the loaded post avatar, `AvatarAccountSize.Lg`. */
const PROFILE_AVATAR_BONE = {
  width: 40,
  height: 40,
  borderRadius: 20,
} as const;
/** Matches `AvatarTokenSize.Md` inside the position card. */
const TOKEN_AVATAR_BONE = { width: 32, height: 32, borderRadius: 16 } as const;
/** Matches `ButtonIconSize.Sm`. */
const MORE_BONE = { width: 24, height: 24, borderRadius: 12 } as const;

const AUTHOR_NAME_BONE = { width: 112, height: 16, borderRadius: 4 } as const;
const TIMESTAMP_BONE = { width: 48, height: 12, borderRadius: 4 } as const;

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
 * Loading placeholder matching {@link SocialFeedPostShell}: a 40px avatar in a
 * left gutter, with the header, position card, and reactions in the column
 * beside it.
 *
 * Uses `SkeletonPlaceholder.Item` (not custom components) so the shimmer mask
 * receives layout styles and Sonar duplication stays low.
 */
const SocialFeedPostSkeleton: React.FC<SocialFeedPostSkeletonProps> = ({
  index,
}) => {
  const tw = useTailwind();
  const cardChromeStyle = tw.style(
    'rounded-2xl border border-muted p-3 gap-2 bg-background-alternative',
  ) as Record<string, unknown>;
  const dividerStyle = tw.style('bg-border-muted') as Record<string, unknown>;

  return (
    <View
      style={tw.style('py-2')}
      testID={getSocialFeedPostSkeletonTestId(index)}
    >
      <SocialFeedSkeletonPlaceholder>
        <Item flexDirection="row" alignItems="flex-start" gap={12}>
          <Item {...PROFILE_AVATAR_BONE} />
          <Item flex={1}>
            <Item
              flexDirection="row"
              alignItems="flex-start"
              justifyContent="space-between"
              gap={8}
            >
              <Item flex={1} gap={8}>
                <Item flexDirection="row" alignItems="center" gap={8}>
                  <Item {...AUTHOR_NAME_BONE} />
                  <Item {...TIMESTAMP_BONE} />
                </Item>
                <Item width={96} height={12} borderRadius={4} />
              </Item>
              <Item {...MORE_BONE} />
            </Item>

            <Item marginTop={8} {...cardChromeStyle} gap={8}>
              <Item
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Item flexDirection="row" alignItems="center" gap={12} flex={1}>
                  <Item {...TOKEN_AVATAR_BONE} />
                  <Item gap={4}>
                    <Item {...CARD_SYMBOL_BONE} />
                    <Item {...CARD_SUBTITLE_BONE} />
                  </Item>
                </Item>
                <Item alignItems="flex-end" gap={6}>
                  <Item {...CARD_VALUE_BONE} />
                  <Item {...CARD_PNL_BONE} />
                </Item>
              </Item>
              <Item height={1} {...dividerStyle} />
              <Item flexDirection="row" justifyContent="space-between">
                {renderPairedBones(PAIR_BONES, 'card-stat')}
              </Item>
              <Item width="100%" height={40} borderRadius={12} />
            </Item>

            <Item
              flexDirection="row"
              alignItems="center"
              gap={8}
              marginTop={12}
            >
              {renderPairedBones(REACTION_BONES, 'reaction')}
            </Item>
          </Item>
        </Item>
      </SocialFeedSkeletonPlaceholder>
    </View>
  );
};

export default SocialFeedPostSkeleton;
