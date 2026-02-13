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

import HeaderCollapsibleStandard from './HeaderCollapsibleStandard';

const HeaderCollapsibleStandardMeta = {
  title: 'Components Temp / HeaderCollapsibleStandard',
  component: HeaderCollapsibleStandard,
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

export default HeaderCollapsibleStandardMeta;

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
        <HeaderCollapsibleStandard
          title="Send"
          onBack={() => console.log('Back pressed')}
          titleStandardProps={{
            topLabel: 'Send',
            title: '$4.42',
          }}
          scrollY={scrollYValue}
          onExpandedHeightChange={setExpandedHeight}
        />
      )}
    </ScrollableStoryContainer>
  ),
};

export const WithBottomLabel = {
  render: () => (
    <ScrollableStoryContainer>
      {({ scrollYValue, setExpandedHeight }) => (
        <HeaderCollapsibleStandard
          title="Send"
          onBack={() => console.log('Back pressed')}
          titleStandardProps={{
            topLabel: 'Send',
            title: '$4.42',
            bottomLabel: '0.002 ETH',
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
        <HeaderCollapsibleStandard
          title="Send"
          subtitle="0.002 ETH"
          onBack={() => console.log('Back pressed')}
          titleStandardProps={{
            topLabel: 'Send',
            title: '$4.42',
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
        <HeaderCollapsibleStandard
          title="Send"
          onClose={() => console.log('Close pressed')}
          titleStandardProps={{
            topLabel: 'Send',
            title: '$4.42',
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
        <HeaderCollapsibleStandard
          title="Send"
          onBack={() => console.log('Back pressed')}
          onClose={() => console.log('Close pressed')}
          titleStandardProps={{
            topLabel: 'Send',
            title: '$4.42',
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
        <HeaderCollapsibleStandard
          title="Send"
          onBack={() => console.log('Back pressed')}
          endButtonIconProps={[
            {
              iconName: IconName.Close,
              onPress: () => console.log('Close pressed'),
            },
          ]}
          titleStandardProps={{
            topLabel: 'Send',
            title: '$4.42',
          }}
          scrollY={scrollYValue}
          onExpandedHeightChange={setExpandedHeight}
        />
      )}
    </ScrollableStoryContainer>
  ),
};

export const CustomTitleStandard = {
  render: () => (
    <ScrollableStoryContainer>
      {({ scrollYValue, setExpandedHeight }) => (
        <HeaderCollapsibleStandard
          title="Custom"
          onBack={() => console.log('Back pressed')}
          titleStandard={
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
