/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

// Internal dependencies.
import HeaderWithTitleLeft from './HeaderWithTitleLeft';

const HeaderWithTitleLeftMeta = {
  title: 'Components Temp / HeaderWithTitleLeft',
  component: HeaderWithTitleLeft,
};

export default HeaderWithTitleLeftMeta;

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

// Basic usage with back button and title left props
const BasicExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('bg-default')}>
      <HeaderWithTitleLeft
        onBack={() => console.log('Back pressed')}
        titleLeftProps={{
          topLabel: 'Send',
          title: '$4.42',
          endAccessory: <SampleNFTImage />,
        }}
      />
    </View>
  );
};

export const Basic = {
  render: () => <BasicExample />,
};

// With bottom label
const WithBottomLabelExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('bg-default')}>
      <HeaderWithTitleLeft
        onBack={() => console.log('Back pressed')}
        titleLeftProps={{
          topLabel: 'Send',
          title: '$4.42',
          bottomLabel: '0.002 ETH',
          endAccessory: <SampleNFTImage />,
        }}
      />
    </View>
  );
};

export const WithBottomLabel = {
  render: () => <WithBottomLabelExample />,
};

// With end accessory in header
const WithHeaderEndAccessoryExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('bg-default')}>
      <HeaderWithTitleLeft
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
      />
    </View>
  );
};

export const WithHeaderEndAccessory = {
  render: () => <WithHeaderEndAccessoryExample />,
};

// With custom back button props
const WithBackButtonPropsExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('bg-default')}>
      <HeaderWithTitleLeft
        backButtonProps={{
          onPress: () => console.log('Custom back pressed'),
        }}
        titleLeftProps={{
          topLabel: 'Receive',
          title: '$1,234.56',
        }}
      />
    </View>
  );
};

export const WithBackButtonProps = {
  render: () => <WithBackButtonPropsExample />,
};

// With custom title left node
const WithCustomTitleLeftExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('bg-default')}>
      <HeaderWithTitleLeft
        onBack={() => console.log('Back pressed')}
        titleLeft={
          <Box twClassName="px-4 py-2">
            <Text variant={TextVariant.HeadingMd}>Custom Title Section</Text>
            <Text variant={TextVariant.BodySm}>
              This is a completely custom title section
            </Text>
          </Box>
        }
      />
    </View>
  );
};

export const WithCustomTitleLeft = {
  render: () => <WithCustomTitleLeftExample />,
};

// No back button (title only)
const NoBackButtonExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('bg-default')}>
      <HeaderWithTitleLeft
        titleLeftProps={{
          topLabel: 'Account Balance',
          title: '$12,345.67',
          bottomLabel: '+$123.45 (1.2%)',
        }}
      />
    </View>
  );
};

export const NoBackButton = {
  render: () => <NoBackButtonExample />,
};

// With top inset
const WithTopInsetExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('bg-default')}>
      <HeaderWithTitleLeft
        includesTopInset
        onBack={() => console.log('Back pressed')}
        titleLeftProps={{
          topLabel: 'Send',
          title: '$4.42',
          endAccessory: <SampleNFTImage />,
        }}
      />
    </View>
  );
};

export const WithTopInset = {
  render: () => <WithTopInsetExample />,
};

