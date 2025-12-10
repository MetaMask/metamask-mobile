/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';
import { View, ScrollView } from 'react-native';

// External dependencies.
import {
  Box,
  Text,
  TextVariant,
  IconName,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

// Internal dependencies.
import HeaderLeftScrollable from './HeaderLeftScrollable';
import useHeaderLeftScrollable from './useHeaderLeftScrollable';

const HeaderLeftScrollableMeta = {
  title: 'Components Temp / HeaderLeftScrollable',
  component: HeaderLeftScrollable,
};

export default HeaderLeftScrollableMeta;

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

// Basic usage with back and close buttons
const BasicExample = () => {
  const tw = useTailwind();
  const {
    onScroll,
    scrollY: scrollYValue,
    expandedHeight,
  } = useHeaderLeftScrollable();

  return (
    <View style={tw.style('flex-1 bg-default')}>
      <HeaderLeftScrollable
        title="Notes"
        leftIcon={{
          iconName: IconName.ArrowLeft,
          onPress: () => console.log('Back pressed'),
        }}
        rightIcon={{
          iconName: IconName.Close,
          onPress: () => console.log('Close pressed'),
        }}
        scrollY={scrollYValue}
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

// Left button only (settings-style screen)
const LeftButtonOnlyExample = () => {
  const tw = useTailwind();
  const {
    onScroll,
    scrollY: scrollYValue,
    expandedHeight,
  } = useHeaderLeftScrollable();

  return (
    <View style={tw.style('flex-1 bg-default')}>
      <HeaderLeftScrollable
        title="Settings"
        leftIcon={{
          iconName: IconName.ArrowLeft,
          onPress: () => console.log('Back pressed'),
        }}
        scrollY={scrollYValue}
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

export const LeftButtonOnly = {
  render: () => <LeftButtonOnlyExample />,
};

// Right button only (modal-style screen)
const RightButtonOnlyExample = () => {
  const tw = useTailwind();
  const {
    onScroll,
    scrollY: scrollYValue,
    expandedHeight,
  } = useHeaderLeftScrollable();

  return (
    <View style={tw.style('flex-1 bg-default')}>
      <HeaderLeftScrollable
        title="Select Token"
        rightIcon={{
          iconName: IconName.Close,
          onPress: () => console.log('Close pressed'),
        }}
        scrollY={scrollYValue}
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

export const RightButtonOnly = {
  render: () => <RightButtonOnlyExample />,
};

// Custom large header content
const CustomLargeHeaderExample = () => {
  const tw = useTailwind();
  const {
    onScroll,
    scrollY: scrollYValue,
    expandedHeight,
  } = useHeaderLeftScrollable();

  const CustomLargeContent = (
    <Box>
      <Text variant={TextVariant.HeadingLg}>My Wallet</Text>
      <Text variant={TextVariant.BodyMd}>Welcome back, user!</Text>
    </Box>
  );

  return (
    <View style={tw.style('flex-1 bg-default')}>
      <HeaderLeftScrollable
        title="My Wallet"
        leftIcon={{
          iconName: IconName.ArrowLeft,
          onPress: () => console.log('Back pressed'),
        }}
        rightIcon={{
          iconName: IconName.Setting,
          onPress: () => console.log('Settings pressed'),
        }}
        largeHeaderContent={CustomLargeContent}
        scrollY={scrollYValue}
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

export const CustomLargeHeader = {
  render: () => <CustomLargeHeaderExample />,
};

// Custom collapse threshold (faster collapse)
const FastCollapseExample = () => {
  const tw = useTailwind();
  const {
    onScroll,
    scrollY: scrollYValue,
    expandedHeight,
  } = useHeaderLeftScrollable({
    collapseThreshold: 60,
  });

  return (
    <View style={tw.style('flex-1 bg-default')}>
      <HeaderLeftScrollable
        title="Fast Collapse"
        leftIcon={{
          iconName: IconName.ArrowLeft,
          onPress: () => console.log('Back pressed'),
        }}
        rightIcon={{
          iconName: IconName.Close,
          onPress: () => console.log('Close pressed'),
        }}
        scrollY={scrollYValue}
        collapseThreshold={60}
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

// No buttons (title only)
const TitleOnlyExample = () => {
  const tw = useTailwind();
  const {
    onScroll,
    scrollY: scrollYValue,
    expandedHeight,
  } = useHeaderLeftScrollable();

  return (
    <View style={tw.style('flex-1 bg-default')}>
      <HeaderLeftScrollable title="Welcome" scrollY={scrollYValue} />
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

export const TitleOnly = {
  render: () => <TitleOnlyExample />,
};

// Different icon combinations
const DifferentIconsExample = () => {
  const tw = useTailwind();
  const {
    onScroll,
    scrollY: scrollYValue,
    expandedHeight,
  } = useHeaderLeftScrollable();

  return (
    <View style={tw.style('flex-1 bg-default')}>
      <HeaderLeftScrollable
        title="Search"
        leftIcon={{
          iconName: IconName.Menu,
          onPress: () => console.log('Menu pressed'),
        }}
        rightIcon={{
          iconName: IconName.Search,
          onPress: () => console.log('Search pressed'),
        }}
        scrollY={scrollYValue}
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

export const DifferentIcons = {
  render: () => <DifferentIconsExample />,
};

