/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import {
  Box,
  Text,
  TextVariant,
  IconName,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

// Internal dependencies.
import HeaderCenter from './HeaderCenter';

const HeaderCenterMeta = {
  title: 'Components Temp / HeaderCenter',
  component: HeaderCenter,
};

export default HeaderCenterMeta;

// Basic usage with title
const BasicExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('p-4 bg-default')}>
      <HeaderCenter title="Page Title" />
    </View>
  );
};

export const Basic = {
  render: () => <BasicExample />,
};

// With close button using onClose
const WithOnCloseExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('p-4 bg-default')}>
      <HeaderCenter
        title="Modal Title"
        onClose={() => console.log('Close pressed')}
      />
    </View>
  );
};

export const WithOnClose = {
  render: () => <WithOnCloseExample />,
};

// With close button using closeButtonProps
const WithCloseButtonPropsExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('p-4 bg-default')}>
      <HeaderCenter
        title="Modal Title"
        closeButtonProps={{
          onPress: () => console.log('Close pressed'),
        }}
      />
    </View>
  );
};

export const WithCloseButtonProps = {
  render: () => <WithCloseButtonPropsExample />,
};

// With disabled close button
const WithDisabledCloseExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('p-4 bg-default')}>
      <HeaderCenter
        title="Cannot Close"
        closeButtonProps={{
          onPress: () => console.log('This should not fire'),
          isDisabled: true,
        }}
      />
    </View>
  );
};

export const WithDisabledClose = {
  render: () => <WithDisabledCloseExample />,
};

// With start button and close
const WithStartButtonAndCloseExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('p-4 bg-default')}>
      <HeaderCenter
        title="Settings"
        startButtonIconProps={{
          iconName: IconName.ArrowLeft,
          onPress: () => console.log('Back pressed'),
        }}
        onClose={() => console.log('Close pressed')}
      />
    </View>
  );
};

export const WithStartButtonAndClose = {
  render: () => <WithStartButtonAndCloseExample />,
};

// With multiple end buttons including close
const WithMultipleEndButtonsExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('p-4 bg-default')}>
      <HeaderCenter
        title="Search"
        startButtonIconProps={{
          iconName: IconName.ArrowLeft,
          onPress: () => console.log('Back pressed'),
        }}
        endButtonIconProps={[
          {
            iconName: IconName.Search,
            onPress: () => console.log('Search pressed'),
          },
        ]}
        onClose={() => console.log('Close pressed')}
      />
      <Text variant={TextVariant.BodySm} style={tw.style('mt-2 text-muted')}>
        Close button is added after other endButtonIconProps
      </Text>
    </View>
  );
};

export const WithMultipleEndButtons = {
  render: () => <WithMultipleEndButtonsExample />,
};

// With custom children instead of title
const WithCustomChildrenExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('p-4 bg-default')}>
      <HeaderCenter
        title="This will be ignored"
        onClose={() => console.log('Close pressed')}
      >
        <Box twClassName="items-center">
          <Text variant={TextVariant.HeadingSm}>Custom Title</Text>
          <Text variant={TextVariant.BodySm}>Subtitle text</Text>
        </Box>
      </HeaderCenter>
      <Text variant={TextVariant.BodySm} style={tw.style('mt-2 text-muted')}>
        children takes priority over title prop
      </Text>
    </View>
  );
};

export const WithCustomChildren = {
  render: () => <WithCustomChildrenExample />,
};

// No close button
const NoCloseButtonExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('p-4 bg-default')}>
      <HeaderCenter
        title="Simple Header"
        startButtonIconProps={{
          iconName: IconName.ArrowLeft,
          onPress: () => console.log('Back pressed'),
        }}
      />
    </View>
  );
};

export const NoCloseButton = {
  render: () => <NoCloseButtonExample />,
};
