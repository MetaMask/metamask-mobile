import React, { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import { useTheme } from '../../../../util/theme';

export interface WhatsHappeningExpandedCardSkeletonProps {
  cardWidth: number;
}

/**
 * Loading placeholder for the detail carousel: matches expanded card width and
 * roughly mirrors tag row, title, body, related-asset rows, and sources footer.
 * Skeleton colors follow {@link WhatsHappeningCardSkeleton}.
 */
const WhatsHappeningExpandedCardSkeleton: React.FC<
  WhatsHappeningExpandedCardSkeletonProps
> = ({ cardWidth }) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();

  const cardHeight = useMemo(
    () =>
      Math.min(
        Math.max(windowHeight * 0.62, 440),
        Math.max(windowHeight - 120, 440),
      ),
    [windowHeight],
  );

  return (
    <Box
      style={{ width: cardWidth, height: cardHeight }}
      testID="whats-happening-expanded-card-skeleton"
    >
      <Box
        flexDirection={BoxFlexDirection.Column}
        twClassName="rounded-2xl bg-background-muted overflow-hidden flex-1 mt-4"
      >
        <SkeletonPlaceholder
          backgroundColor={colors.background.section}
          highlightColor={colors.background.subsection}
        >
          <View>
            <View style={tw.style('pt-7 px-5 pb-5 gap-4')}>
              <View style={tw.style('flex-row gap-2 flex-wrap')}>
                <View style={tw.style('w-14 h-6 rounded-md')} />
                <View style={tw.style('w-[72px] h-6 rounded-md')} />
              </View>

              <View style={tw.style('gap-1.5')}>
                <View style={tw.style('w-full h-7 rounded')} />
                <View style={tw.style('w-[92%] h-7 rounded')} />
                <View style={tw.style('w-[48%] h-7 rounded')} />
              </View>

              <View style={tw.style('gap-1')}>
                <View style={tw.style('w-full h-4 rounded')} />
                <View style={tw.style('w-full h-4 rounded')} />
                <View style={tw.style('w-[88%] h-4 rounded')} />
                <View style={tw.style('w-[64%] h-4 rounded')} />
              </View>

              <View style={tw.style('gap-3 pt-1')}>
                <View style={tw.style('w-36 h-5 rounded')} />
                {[0, 1, 2].map((i) => (
                  <View
                    key={`asset-skel-${i}`}
                    style={tw.style(
                      'flex-row items-center justify-between gap-3 py-1',
                    )}
                  >
                    <View
                      style={tw.style('flex-row items-center gap-3 flex-1')}
                    >
                      <View style={tw.style('w-10 h-10 rounded-full')} />
                      <View style={tw.style('flex-1 gap-1.5')}>
                        <View style={tw.style('w-[55%] h-4 rounded')} />
                        <View style={tw.style('w-[40%] h-3 rounded')} />
                      </View>
                    </View>
                    <View style={tw.style('w-[72px] h-9 rounded-lg')} />
                  </View>
                ))}
              </View>
            </View>

            <View style={tw.style('px-5 pb-5 pt-4')}>
              <View
                style={tw.style('flex-row items-center justify-between gap-2')}
              >
                <View style={tw.style('flex-row items-center gap-2 flex-1')}>
                  <View style={tw.style('w-6 h-6 rounded-full')} />
                  <View style={tw.style('flex-1 max-w-[70%] h-4 rounded')} />
                </View>
                <View style={tw.style('w-12 h-4 rounded')} />
              </View>
            </View>
          </View>
        </SkeletonPlaceholder>
      </Box>
    </Box>
  );
};

export default WhatsHappeningExpandedCardSkeleton;
