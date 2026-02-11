/* eslint-disable no-console */
import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

import {
  Box,
  Text,
  TextVariant,
  IconName,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSharedValue, SharedValue } from 'react-native-reanimated';

import { AvatarSize } from '../../components/Avatars/Avatar/Avatar.types';
import AvatarToken from '../../components/Avatars/Avatar/variants/AvatarToken';
import { SAMPLE_AVATARTOKEN_PROPS } from '../../components/Avatars/Avatar/variants/AvatarToken/AvatarToken.constants';

import HeaderCollapsibleSubpage from './HeaderCollapsibleSubpage';

const HeaderCollapsibleSubpageMeta = {
  title: 'Components Temp / HeaderCollapsibleSubpage',
  component: HeaderCollapsibleSubpage,
  argTypes: {
    title: {
      control: 'text',
    },
    subtitle: {
      control: 'text',
    },
    twClassName: {
      control: 'text',
    },
  },
};

export default HeaderCollapsibleSubpageMeta;

const SampleContent = ({ itemCount = 20 }: { itemCount?: number }) => (
  <>
    {Array.from({ length: itemCount }).map((_, index) => (
      <Box key={index} twClassName="p-4 mb-2 bg-muted rounded-lg mx-4">
        <Text variant={TextVariant.BodyMd}>Item {index + 1}</Text>
        <Text variant={TextVariant.BodySm}>
          This is sample content to demonstrate scrolling behavior.
        </Text>
      </Box>
    ))}
  </>
);

interface ScrollableStoryContainerProps {
  children: (props: {
    scrollYValue: SharedValue<number>;
    setExpandedHeight: (h: number) => void;
  }) => React.ReactNode;
}

const ScrollableStoryContainer = ({
  children,
}: ScrollableStoryContainerProps) => {
  const tw = useTailwind();
  const scrollYValue = useSharedValue(0);
  const [expandedHeight, setExpandedHeight] = useState(140);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollYValue.value = event.nativeEvent.contentOffset.y;
    },
    [scrollYValue],
  );

  return (
    <View style={tw.style('flex-1 bg-default')}>
      {children({ scrollYValue, setExpandedHeight })}
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: expandedHeight }}
        showsVerticalScrollIndicator={false}
      >
        <SampleContent />
      </ScrollView>
    </View>
  );
};

export const Default = {
  render: () => (
    <ScrollableStoryContainer>
      {({ scrollYValue, setExpandedHeight }) => (
        <HeaderCollapsibleSubpage
          title="Token Name"
          onBack={() => console.log('Back pressed')}
          titleSubpageProps={{
            title: 'Token Name',
            bottomLabel: '$1,234.56',
          }}
          scrollY={scrollYValue}
          onExpandedHeightChange={setExpandedHeight}
        />
      )}
    </ScrollableStoryContainer>
  ),
};

export const WithStartAccessory = {
  render: () => (
    <ScrollableStoryContainer>
      {({ scrollYValue, setExpandedHeight }) => (
        <HeaderCollapsibleSubpage
          title="Wrapped Ethereum"
          onBack={() => console.log('Back pressed')}
          titleSubpageProps={{
            startAccessory: (
              <AvatarToken {...SAMPLE_AVATARTOKEN_PROPS} size={AvatarSize.Lg} />
            ),
            title: 'Wrapped Ethereum',
            bottomLabel: '$3,456.78',
          }}
          scrollY={scrollYValue}
          onExpandedHeightChange={setExpandedHeight}
        />
      )}
    </ScrollableStoryContainer>
  ),
};

export const WithSubtitle = {
  render: () => (
    <ScrollableStoryContainer>
      {({ scrollYValue, setExpandedHeight }) => (
        <HeaderCollapsibleSubpage
          title="Token Name"
          subtitle="1.5 WETH"
          onBack={() => console.log('Back pressed')}
          titleSubpageProps={{
            startAccessory: (
              <AvatarToken {...SAMPLE_AVATARTOKEN_PROPS} size={AvatarSize.Lg} />
            ),
            title: 'Wrapped Ethereum',
            bottomLabel: '$3,456.78',
          }}
          scrollY={scrollYValue}
          onExpandedHeightChange={setExpandedHeight}
        />
      )}
    </ScrollableStoryContainer>
  ),
};

export const OnClose = {
  render: () => (
    <ScrollableStoryContainer>
      {({ scrollYValue, setExpandedHeight }) => (
        <HeaderCollapsibleSubpage
          title="Token Name"
          onClose={() => console.log('Close pressed')}
          titleSubpageProps={{
            title: 'Token Name',
            bottomLabel: '$1,234.56',
          }}
          scrollY={scrollYValue}
          onExpandedHeightChange={setExpandedHeight}
        />
      )}
    </ScrollableStoryContainer>
  ),
};

export const BackAndClose = {
  render: () => (
    <ScrollableStoryContainer>
      {({ scrollYValue, setExpandedHeight }) => (
        <HeaderCollapsibleSubpage
          title="Token Name"
          onBack={() => console.log('Back pressed')}
          onClose={() => console.log('Close pressed')}
          titleSubpageProps={{
            startAccessory: (
              <AvatarToken {...SAMPLE_AVATARTOKEN_PROPS} size={AvatarSize.Lg} />
            ),
            title: 'Wrapped Ethereum',
            bottomLabel: '$3,456.78',
          }}
          scrollY={scrollYValue}
          onExpandedHeightChange={setExpandedHeight}
        />
      )}
    </ScrollableStoryContainer>
  ),
};

export const EndButtonIconProps = {
  render: () => (
    <ScrollableStoryContainer>
      {({ scrollYValue, setExpandedHeight }) => (
        <HeaderCollapsibleSubpage
          title="Token Name"
          onBack={() => console.log('Back pressed')}
          endButtonIconProps={[
            {
              iconName: IconName.Close,
              onPress: () => console.log('Close pressed'),
            },
          ]}
          titleSubpageProps={{
            title: 'Token Name',
            bottomLabel: '$1,234.56',
          }}
          scrollY={scrollYValue}
          onExpandedHeightChange={setExpandedHeight}
        />
      )}
    </ScrollableStoryContainer>
  ),
};

export const CustomTitleSubpage = {
  render: () => (
    <ScrollableStoryContainer>
      {({ scrollYValue, setExpandedHeight }) => (
        <HeaderCollapsibleSubpage
          title="Custom"
          onBack={() => console.log('Back pressed')}
          titleSubpage={
            <Box twClassName="px-4 py-2">
              <Text variant={TextVariant.HeadingMd}>Custom Title Section</Text>
              <Text variant={TextVariant.BodySm}>
                This is a completely custom expanded content section
              </Text>
            </Box>
          }
          scrollY={scrollYValue}
          onExpandedHeightChange={setExpandedHeight}
        />
      )}
    </ScrollableStoryContainer>
  ),
};
