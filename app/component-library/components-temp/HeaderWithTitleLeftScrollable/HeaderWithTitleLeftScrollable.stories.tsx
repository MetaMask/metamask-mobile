/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';
import { View, ScrollView } from 'react-native';

// External dependencies.
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

// Internal dependencies.
import HeaderWithTitleLeftScrollable from './HeaderWithTitleLeftScrollable';
import useHeaderWithTitleLeftScrollable from './useHeaderWithTitleLeftScrollable';

const HeaderWithTitleLeftScrollableMeta = {
  title: 'Components Temp / HeaderWithTitleLeftScrollable',
  component: HeaderWithTitleLeftScrollable,
};

export default HeaderWithTitleLeftScrollableMeta;

// Sample NFT image component for stories
const SampleNFTImage = () => {
  const tw = useTailwind();
  return (
    <View
      style={tw.style(
        'w-12 h-12 rounded-lg bg-success-muted items-center justify-center',
      )}
    >
      <Text variant={TextVariant.BodySm}>NFT</Text>
    </View>
  );
};

// Helper component to generate sample content
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

// Basic usage with back button and titleLeftProps
const BasicExample = () => {
  const tw = useTailwind();
  const { onScroll, scrollY, expandedHeight, setExpandedHeight } =
    useHeaderWithTitleLeftScrollable();

  return (
    <View style={tw.style('flex-1 bg-default')}>
      <HeaderWithTitleLeftScrollable
        title="Send"
        onBack={() => console.log('Back pressed')}
        titleLeftProps={{
          topLabel: 'Send',
          title: '$4.42',
          endAccessory: <SampleNFTImage />,
        }}
        scrollY={scrollY}
        onExpandedHeightChange={setExpandedHeight}
      />
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

export const Basic = {
  render: () => <BasicExample />,
};

// With bottom label in TitleLeft
const WithBottomLabelExample = () => {
  const tw = useTailwind();
  const { onScroll, scrollY, expandedHeight, setExpandedHeight } =
    useHeaderWithTitleLeftScrollable();

  return (
    <View style={tw.style('flex-1 bg-default')}>
      <HeaderWithTitleLeftScrollable
        title="Send"
        onBack={() => console.log('Back pressed')}
        titleLeftProps={{
          topLabel: 'Send',
          title: '$4.42',
          bottomLabel: '0.002 ETH',
          endAccessory: <SampleNFTImage />,
        }}
        scrollY={scrollY}
        onExpandedHeightChange={setExpandedHeight}
      />
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

export const WithBottomLabel = {
  render: () => <WithBottomLabelExample />,
};

// With end button icons in header
const WithEndButtonsExample = () => {
  const tw = useTailwind();
  const { onScroll, scrollY, expandedHeight, setExpandedHeight } =
    useHeaderWithTitleLeftScrollable();

  return (
    <View style={tw.style('flex-1 bg-default')}>
      <HeaderWithTitleLeftScrollable
        title="Send"
        onBack={() => console.log('Back pressed')}
        endButtonIconProps={[
          {
            iconName: 'Close' as never,
            onPress: () => console.log('Close pressed'),
          },
        ]}
        titleLeftProps={{
          topLabel: 'Send',
          title: '$4.42',
          endAccessory: <SampleNFTImage />,
        }}
        scrollY={scrollY}
        onExpandedHeightChange={setExpandedHeight}
      />
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

export const WithEndButtons = {
  render: () => <WithEndButtonsExample />,
};

// With custom titleLeft node
const WithCustomTitleLeftExample = () => {
  const tw = useTailwind();
  const { onScroll, scrollY, expandedHeight, setExpandedHeight } =
    useHeaderWithTitleLeftScrollable();

  return (
    <View style={tw.style('flex-1 bg-default')}>
      <HeaderWithTitleLeftScrollable
        title="Custom"
        onBack={() => console.log('Back pressed')}
        titleLeft={
          <Box twClassName="px-4 py-2">
            <Text variant={TextVariant.HeadingLg}>Custom Title Section</Text>
            <Text variant={TextVariant.BodySm}>
              This is a completely custom title section
            </Text>
          </Box>
        }
        scrollY={scrollY}
        onExpandedHeightChange={setExpandedHeight}
      />
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

export const WithCustomTitleLeft = {
  render: () => <WithCustomTitleLeftExample />,
};

// Default large title (no titleLeft or titleLeftProps)
const DefaultLargeTitleExample = () => {
  const tw = useTailwind();
  const { onScroll, scrollY, expandedHeight, setExpandedHeight } =
    useHeaderWithTitleLeftScrollable();

  return (
    <View style={tw.style('flex-1 bg-default')}>
      <HeaderWithTitleLeftScrollable
        title="Settings"
        onBack={() => console.log('Back pressed')}
        scrollY={scrollY}
        onExpandedHeightChange={setExpandedHeight}
      />
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

export const DefaultLargeTitle = {
  render: () => <DefaultLargeTitleExample />,
};

// Custom scroll trigger position (faster collapse)
const FastCollapseExample = () => {
  const tw = useTailwind();
  const { onScroll, scrollY, expandedHeight, setExpandedHeight } =
    useHeaderWithTitleLeftScrollable({
      scrollTriggerPosition: 60,
    });

  return (
    <View style={tw.style('flex-1 bg-default')}>
      <HeaderWithTitleLeftScrollable
        title="Fast Collapse"
        onBack={() => console.log('Back pressed')}
        titleLeftProps={{
          topLabel: 'Send',
          title: '$4.42',
          endAccessory: <SampleNFTImage />,
        }}
        scrollY={scrollY}
        scrollTriggerPosition={60}
        onExpandedHeightChange={setExpandedHeight}
      />
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

export const FastCollapse = {
  render: () => <FastCollapseExample />,
};
