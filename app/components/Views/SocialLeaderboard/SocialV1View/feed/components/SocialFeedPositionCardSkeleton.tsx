import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../util/theme';

export const SOCIAL_FEED_POSITION_CARD_SKELETON_TEST_ID =
  'social-v1-feed-card-skeleton';

/**
 * Loading placeholder for a V1 feed post. Traces the real layout: the author
 * avatar in its gutter, the name / age header line and the caption, then the
 * position card's own header, three stat rows and CTA.
 *
 * Deliberately not the V0 `FeedItemRowSkeleton` -- that one mirrors a compact
 * row, so the list would visibly reflow into much taller cards on load.
 */
const SocialFeedPositionCardSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const tw = useTailwind();

  return (
    <View
      style={tw.style('px-4')}
      testID={SOCIAL_FEED_POSITION_CARD_SKELETON_TEST_ID}
    >
      <SkeletonPlaceholder
        backgroundColor={colors.background.section}
        highlightColor={colors.background.subsection}
      >
        <View style={tw.style('flex-row gap-3')}>
          {/* Author avatar gutter */}
          <View style={tw.style('w-10 h-10 rounded-full')} />

          <View style={tw.style('flex-1 gap-2')}>
            {/* Name + win-rate badge, with the post age right-aligned */}
            <View style={tw.style('flex-row items-center justify-between')}>
              <View style={tw.style('w-32 h-5 rounded')} />
              <View style={tw.style('w-16 h-4 rounded')} />
            </View>

            {/* Caption */}
            <View style={tw.style('w-48 h-5 rounded')} />

            {/* Position card */}
            <View style={tw.style('h-52 rounded-2xl')} />
          </View>
        </View>
      </SkeletonPlaceholder>
    </View>
  );
};

export default SocialFeedPositionCardSkeleton;
