/* eslint-disable no-console */
import React from 'react';
import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  Box,
  Text,
  TextVariant,
  IconName,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SharedValue } from 'react-native-reanimated';

import HeaderWithTitleLeftScrollable from './HeaderWithTitleLeftScrollable';
import useHeaderWithTitleLeftScrollable from './useHeaderWithTitleLeftScrollable';
import { UseHeaderWithTitleLeftScrollableOptions } from './HeaderWithTitleLeftScrollable.types';

const HeaderWithTitleLeftScrollableMeta = {
  title: 'Components Temp / HeaderWithTitleLeftScrollable',
  component: HeaderWithTitleLeftScrollable,
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

export default HeaderWithTitleLeftScrollableMeta;

const SampleNFTImage = () => (
  <Box twClassName="w-12 h-12 rounded-lg bg-success-muted items-center justify-center">
    <Text variant={TextVariant.BodySm}>NFT</Text>
  </Box>
);

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
  hookOptions?: UseHeaderWithTitleLeftScrollableOptions;
}

const ScrollableStoryContainer = ({
  children,
  hookOptions,
}: ScrollableStoryContainerProps) => {
  const tw = useTailwind();
  const {
    onScroll,
    scrollY: scrollYValue,
    expandedHeight,
    setExpandedHeight,
  } = useHeaderWithTitleLeftScrollable(hookOptions);

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
        <HeaderWithTitleLeftScrollable
          title="Send"
          onBack={() => console.log('Back pressed')}
          titleLeftProps={{
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

export const OnBack = {
  render: () => (
    <ScrollableStoryContainer>
      {({ scrollYValue, setExpandedHeight }) => (
        <HeaderWithTitleLeftScrollable
          title="Send"
          onBack={() => console.log('Back pressed')}
          titleLeftProps={{
            topLabel: 'Send',
            title: '$4.42',
            endAccessory: <SampleNFTImage />,
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
        <HeaderWithTitleLeftScrollable
          title="Send"
          onBack={() => console.log('Back pressed')}
          titleLeftProps={{
            topLabel: 'Send',
            title: '$4.42',
            bottomLabel: '0.002 ETH',
            endAccessory: <SampleNFTImage />,
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
        <HeaderWithTitleLeftScrollable
          title="Send"
          subtitle="0.002 ETH"
          onBack={() => console.log('Back pressed')}
          titleLeftProps={{
            topLabel: 'Send',
            title: '$4.42',
            endAccessory: <SampleNFTImage />,
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
        <HeaderWithTitleLeftScrollable
          title="Send"
          onClose={() => console.log('Close pressed')}
          titleLeftProps={{
            topLabel: 'Send',
            title: '$4.42',
            endAccessory: <SampleNFTImage />,
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
        <HeaderWithTitleLeftScrollable
          title="Send"
          onBack={() => console.log('Back pressed')}
          onClose={() => console.log('Close pressed')}
          titleLeftProps={{
            topLabel: 'Send',
            title: '$4.42',
            endAccessory: <SampleNFTImage />,
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
        <HeaderWithTitleLeftScrollable
          title="Send"
          onBack={() => console.log('Back pressed')}
          endButtonIconProps={[
            {
              iconName: IconName.Close,
              onPress: () => console.log('Close pressed'),
            },
          ]}
          titleLeftProps={{
            topLabel: 'Send',
            title: '$4.42',
            endAccessory: <SampleNFTImage />,
          }}
          scrollY={scrollYValue}
          onExpandedHeightChange={setExpandedHeight}
        />
      )}
    </ScrollableStoryContainer>
  ),
};

export const BackButtonProps = {
  render: () => (
    <ScrollableStoryContainer>
      {({ scrollYValue, setExpandedHeight }) => (
        <HeaderWithTitleLeftScrollable
          title="Receive"
          backButtonProps={{
            onPress: () => console.log('Custom back pressed'),
          }}
          titleLeftProps={{
            topLabel: 'Receive',
            title: '$1,234.56',
          }}
          scrollY={scrollYValue}
          onExpandedHeightChange={setExpandedHeight}
        />
      )}
    </ScrollableStoryContainer>
  ),
};

export const TitleLeft = {
  render: () => (
    <ScrollableStoryContainer>
      {({ scrollYValue, setExpandedHeight }) => (
        <HeaderWithTitleLeftScrollable
          title="Custom"
          onBack={() => console.log('Back pressed')}
          titleLeft={
            <Box twClassName="px-4 py-2">
              <Text variant={TextVariant.HeadingMd}>Custom Title Section</Text>
              <Text variant={TextVariant.BodySm}>
                This is a completely custom title section
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
