import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { getSocialFeedPostSkeletonTestId } from './SocialFeedPostSkeleton.testIds';
import { SocialFeedSkeletonPlaceholder } from './SocialFeedSkeletonPlaceholder';

export interface SocialFeedPostSkeletonProps {
  index: number;
}

const SkeletonBlock: React.FC<{ twClassName: string }> = ({ twClassName }) => {
  const tw = useTailwind();
  return <View style={tw.style(twClassName)} />;
};

const SkeletonAvatarInlineGroup: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const tw = useTailwind();
  return (
    <View style={tw.style('flex-row items-center gap-2 flex-1')}>
      <SkeletonBlock twClassName="w-8 h-8 rounded-full" />
      {children}
    </View>
  );
};

/**
 * Loading placeholder matching {@link SocialFeedPostShell}: author row,
 * position card, and reaction affordances.
 */
const SocialFeedPostSkeleton: React.FC<SocialFeedPostSkeletonProps> = ({
  index,
}) => {
  const tw = useTailwind();
  const rootStyle = tw.style('gap-3') as ViewStyle;

  return (
    <View testID={getSocialFeedPostSkeletonTestId(index)} style={rootStyle}>
      <SocialFeedSkeletonPlaceholder>
        <View style={rootStyle}>
          <View style={tw.style('flex-row items-center justify-between')}>
            <SkeletonAvatarInlineGroup>
              <SkeletonBlock twClassName="w-28 h-4 rounded" />
              <SkeletonBlock twClassName="w-16 h-5 rounded-full" />
            </SkeletonAvatarInlineGroup>
            <SkeletonBlock twClassName="w-8 h-3 rounded" />
          </View>
          <View
            style={tw.style(
              'rounded-2xl border border-muted p-4 gap-3 bg-background-alternative',
            )}
          >
            <View style={tw.style('flex-row items-center justify-between')}>
              <SkeletonAvatarInlineGroup>
                <View style={tw.style('gap-1.5')}>
                  <SkeletonBlock twClassName="w-20 h-4 rounded" />
                  <SkeletonBlock twClassName="w-12 h-3 rounded" />
                </View>
              </SkeletonAvatarInlineGroup>
              <View style={tw.style('items-end gap-1.5')}>
                <SkeletonBlock twClassName="w-24 h-5 rounded" />
                <SkeletonBlock twClassName="w-14 h-3 rounded" />
              </View>
            </View>
            <View style={tw.style('h-px bg-border-muted')} />
            <View style={tw.style('flex-row justify-between')}>
              <SkeletonBlock twClassName="w-20 h-3 rounded" />
              <SkeletonBlock twClassName="w-16 h-3 rounded" />
            </View>
            <SkeletonBlock twClassName="w-full h-10 rounded-full" />
          </View>
          <View style={tw.style('flex-row items-center gap-4')}>
            <SkeletonBlock twClassName="w-10 h-4 rounded" />
            <SkeletonBlock twClassName="w-10 h-4 rounded" />
          </View>
        </View>
      </SocialFeedSkeletonPlaceholder>
    </View>
  );
};

export default SocialFeedPostSkeleton;
