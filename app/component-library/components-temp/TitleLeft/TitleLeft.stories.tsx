/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';
import { View, Image } from 'react-native';

// External dependencies.
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

// Internal dependencies.
import TitleLeft from './TitleLeft';

const TitleLeftMeta = {
  title: 'Components Temp / TitleLeft',
  component: TitleLeft,
};

export default TitleLeftMeta;

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

// Basic usage matching the design (Send, $4.42, NFT image)
const BasicExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('py-4 bg-default')}>
      <TitleLeft
        topLabel="Send"
        title="$4.42"
        endAccessory={<SampleNFTImage />}
      />
    </View>
  );
};

export const Basic = {
  render: () => <BasicExample />,
};

// With title only
const TitleOnlyExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('py-4 bg-default')}>
      <TitleLeft title="$1,234.56" />
    </View>
  );
};

export const TitleOnly = {
  render: () => <TitleOnlyExample />,
};

// With top label and title
const WithTopLabelExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('py-4 bg-default')}>
      <TitleLeft topLabel="Total Balance" title="$5,432.10" />
    </View>
  );
};

export const WithTopLabel = {
  render: () => <WithTopLabelExample />,
};

// With bottom label
const WithBottomLabelExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('py-4 bg-default')}>
      <TitleLeft
        topLabel="Send"
        title="$4.42"
        bottomLabel="0.002 ETH"
        endAccessory={<SampleNFTImage />}
      />
    </View>
  );
};

export const WithBottomLabel = {
  render: () => <WithBottomLabelExample />,
};

// With title accessory (icon next to title)
const WithTitleAccessoryExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('py-4 bg-default')}>
      <TitleLeft
        topLabel="Balance"
        title="$4.42"
        titleAccessory={
          <Box twClassName="ml-2">
            <Icon name={IconName.Info} size={IconSize.Sm} />
          </Box>
        }
      />
    </View>
  );
};

export const WithTitleAccessory = {
  render: () => <WithTitleAccessoryExample />,
};

// With custom top accessory (instead of label)
const WithTopAccessoryExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('py-4 bg-default')}>
      <TitleLeft
        topAccessory={
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            <Icon name={IconName.Arrow2Up} size={IconSize.Sm} />
            <Text variant={TextVariant.BodySm}>Sending to</Text>
          </Box>
        }
        title="0x1234...5678"
        endAccessory={<SampleNFTImage />}
      />
    </View>
  );
};

export const WithTopAccessory = {
  render: () => <WithTopAccessoryExample />,
};

// With custom bottom accessory
const WithBottomAccessoryExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('py-4 bg-default')}>
      <TitleLeft
        topLabel="Send"
        title="$4.42"
        bottomAccessory={
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            <Icon name={IconName.Gas} size={IconSize.Xs} />
            <Text variant={TextVariant.BodySm}>~$0.50 fee</Text>
          </Box>
        }
        endAccessory={<SampleNFTImage />}
      />
    </View>
  );
};

export const WithBottomAccessory = {
  render: () => <WithBottomAccessoryExample />,
};

// Full example with all props
const FullExampleComponent = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('py-4 bg-default')}>
      <TitleLeft
        topLabel="Send"
        title="$4.42"
        titleAccessory={
          <Box twClassName="ml-1">
            <Icon name={IconName.Info} size={IconSize.Sm} />
          </Box>
        }
        bottomLabel="0.002 ETH"
        endAccessory={<SampleNFTImage />}
      />
    </View>
  );
};

export const FullExample = {
  render: () => <FullExampleComponent />,
};

// Without end accessory
const NoEndAccessoryExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('py-4 bg-default')}>
      <TitleLeft
        topLabel="Account Balance"
        title="$12,345.67"
        bottomLabel="+$123.45 (1.2%)"
      />
    </View>
  );
};

export const NoEndAccessory = {
  render: () => <NoEndAccessoryExample />,
};
