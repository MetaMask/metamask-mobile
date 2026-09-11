import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useImperativeHandle, useRef, useState } from 'react';
import type { ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { SocialFeedPositionCard } from '../SocialV1View/feed/components';
import { useMockSocialV1Feed } from '../SocialV1View/feed/hooks/useMockSocialV1Feed';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import SubnavPills from './SubnavPills';
import { SOCIAL_SHELL_TAB_CONFIG } from './tabConfig';
import type { SocialShellSubnavId, SocialShellTab } from './types';

type AnimatedScrollHandler = React.ComponentProps<
  typeof Animated.ScrollView
>['onScroll'];

export interface EmptyShellTabPageProps {
  tab: SocialShellTab;
  onScroll?: AnimatedScrollHandler;
  pageRef?: React.Ref<SocialTabPageHandle>;
  containerTestID: string;
  scrollTestID: string;
}

/**
 * Social Bundle V1 tab page: subnav pills plus, on Feed, mocked position
 * cards until the API supplies post/comment fields.
 */
const EmptyShellTabPage: React.FC<EmptyShellTabPageProps> = ({
  tab,
  onScroll,
  pageRef,
  containerTestID,
  scrollTestID,
}) => {
  const tw = useTailwind();
  const scrollRef = useRef<ScrollView>(null);
  const config = SOCIAL_SHELL_TAB_CONFIG[tab];
  const [selectedSubnav, setSelectedSubnav] = useState<SocialShellSubnavId>(
    config.defaultSubnav,
  );
  const { items: feedItems } = useMockSocialV1Feed();

  useImperativeHandle(
    pageRef,
    () => ({
      scrollToOffset: (offset: number, animated = false) => {
        scrollRef.current?.scrollTo({ y: offset, animated });
      },
    }),
    [],
  );

  return (
    <Box twClassName="flex-1 bg-default" testID={containerTestID}>
      <Animated.ScrollView
        ref={scrollRef}
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('flex-grow')}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        testID={scrollTestID}
      >
        <SubnavPills
          items={config.subnav}
          value={selectedSubnav}
          onChange={setSelectedSubnav}
        />
        {tab === 'feed' ? (
          <Box twClassName="px-4 pt-4 pb-8 gap-6">
            {feedItems.map((item) => (
              <SocialFeedPositionCard key={item.id} item={item} />
            ))}
          </Box>
        ) : null}
      </Animated.ScrollView>
    </Box>
  );
};

export default EmptyShellTabPage;
