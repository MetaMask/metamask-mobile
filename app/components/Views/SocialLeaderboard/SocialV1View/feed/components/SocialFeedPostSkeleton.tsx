import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { View } from 'react-native';
import { getSocialFeedPostSkeletonTestId } from './SocialFeedPostSkeleton.testIds';
import { SocialFeedSkeletonPlaceholder } from './SocialFeedSkeletonPlaceholder';

export interface SocialFeedPostSkeletonProps {
  index: number;
}

/**
 * Loading placeholder matching {@link SocialFeedPostShell}: author row,
 * position card, and reaction affordances.
 *
 * SkeletonPlaceholder only reads `style` on direct View elements in its child
 * tree — keep layout as plain Views (no wrapper components) so bones keep size.
 */
const SocialFeedPostSkeleton: React.FC<SocialFeedPostSkeletonProps> = ({
  index,
}) => {
  const tw = useTailwind();

  return (
    <View
      style={tw.style('gap-3')}
      testID={getSocialFeedPostSkeletonTestId(index)}
    >
      <SocialFeedSkeletonPlaceholder>
        <View style={tw.style('gap-3')}>
          <View style={tw.style('flex-row items-center justify-between')}>
            <View style={tw.style('flex-row items-center gap-2 flex-1')}>
              <View style={tw.style('w-8 h-8 rounded-full')} />
              <View style={tw.style('w-28 h-4 rounded')} />
              <View style={tw.style('w-16 h-5 rounded-full')} />
            </View>
            <View style={tw.style('w-8 h-3 rounded')} />
          </View>
          <View
            style={tw.style(
              'rounded-2xl border border-muted p-4 gap-3 bg-background-alternative',
            )}
          >
            <View style={tw.style('flex-row items-center justify-between')}>
              <View style={tw.style('flex-row items-center gap-2 flex-1')}>
                <View style={tw.style('w-8 h-8 rounded-full')} />
                <View style={tw.style('gap-1.5')}>
                  <View style={tw.style('w-20 h-4 rounded')} />
                  <View style={tw.style('w-12 h-3 rounded')} />
                </View>
              </View>
              <View style={tw.style('items-end gap-1.5')}>
                <View style={tw.style('w-24 h-5 rounded')} />
                <View style={tw.style('w-14 h-3 rounded')} />
              </View>
            </View>
            <View style={tw.style('h-px bg-border-muted')} />
            <View style={tw.style('flex-row justify-between')}>
              <View style={tw.style('w-20 h-3 rounded')} />
              <View style={tw.style('w-16 h-3 rounded')} />
            </View>
            <View style={tw.style('w-full h-10 rounded-full')} />
          </View>
          <View style={tw.style('flex-row items-center gap-4')}>
            <View style={tw.style('w-10 h-4 rounded')} />
            <View style={tw.style('w-10 h-4 rounded')} />
          </View>
        </View>
      </SocialFeedSkeletonPlaceholder>
    </View>
  );
};

export default SocialFeedPostSkeleton;
