/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import {
  Box,
  Text,
  TextVariant,
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

// Internal dependencies.
import HeaderBase from './HeaderBase';

const HeaderBaseMeta = {
  title: 'Component Library / HeaderBase',
  component: HeaderBase,
};

export default HeaderBaseMeta;

// Basic usage with text title
const BasicExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('p-4 bg-default')}>
      <HeaderBase>Header Title</HeaderBase>
    </View>
  );
};

export const Basic = {
  render: () => <BasicExample />,
};

// With startButtonIconProps (back button)
const WithStartButtonIconPropsExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('p-4 bg-default')}>
      <HeaderBase
        startButtonIconProps={{
          iconName: IconName.ArrowLeft,
          onPress: () => console.log('Back pressed'),
        }}
      >
        Settings
      </HeaderBase>
    </View>
  );
};

export const WithStartButtonIconProps = {
  render: () => <WithStartButtonIconPropsExample />,
};

// With endButtonIconProps (single button)
const WithEndButtonIconPropsExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('p-4 bg-default')}>
      <HeaderBase
        endButtonIconProps={[
          { iconName: IconName.Close, onPress: () => console.log('Close pressed') },
        ]}
      >
        Modal Title
      </HeaderBase>
    </View>
  );
};

export const WithEndButtonIconProps = {
  render: () => <WithEndButtonIconPropsExample />,
};

// With multiple endButtonIconProps (first item appears rightmost)
const WithMultipleEndButtonIconPropsExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('p-4 bg-default')}>
      <HeaderBase
        startButtonIconProps={{
          iconName: IconName.ArrowLeft,
          onPress: () => console.log('Back pressed'),
        }}
        endButtonIconProps={[
          { iconName: IconName.Search, onPress: () => console.log('Search pressed') },
          { iconName: IconName.Setting, onPress: () => console.log('Settings pressed') },
          { iconName: IconName.Close, onPress: () => console.log('Close pressed') },
        ]}
      >
        Multiple End Icons
      </HeaderBase>
      <Text variant={TextVariant.BodySm} style={tw.style('mt-2 text-muted')}>
        Order: Search, Settings, Close (Close appears rightmost)
      </Text>
    </View>
  );
};

export const WithMultipleEndButtonIconProps = {
  render: () => <WithMultipleEndButtonIconPropsExample />,
};

// With start accessory (back button) - legacy
const WithStartAccessoryExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('p-4 bg-default')}>
      <HeaderBase
        startAccessory={
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Md}
            onPress={() => console.log('Back pressed')}
          />
        }
      >
        Settings
      </HeaderBase>
    </View>
  );
};

export const WithStartAccessory = {
  render: () => <WithStartAccessoryExample />,
};

// With end accessory (close button) - legacy
const WithEndAccessoryExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('p-4 bg-default')}>
      <HeaderBase
        endAccessory={
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Md}
            onPress={() => console.log('Close pressed')}
          />
        }
      >
        Modal Title
      </HeaderBase>
    </View>
  );
};

export const WithEndAccessory = {
  render: () => <WithEndAccessoryExample />,
};

// With both accessories - legacy
const WithBothAccessoriesExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('p-4 bg-default')}>
      <HeaderBase
        startAccessory={
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Md}
            onPress={() => console.log('Back pressed')}
          />
        }
        endAccessory={
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Md}
            onPress={() => console.log('Close pressed')}
          />
        }
      >
        Page Title
      </HeaderBase>
    </View>
  );
};

export const WithBothAccessories = {
  render: () => <WithBothAccessoriesExample />,
};

// With custom children
const WithCustomChildrenExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('p-4 bg-default')}>
      <HeaderBase
        startButtonIconProps={{
          iconName: IconName.ArrowLeft,
          onPress: () => console.log('Back pressed'),
        }}
        endButtonIconProps={[
          { iconName: IconName.Setting, onPress: () => console.log('Settings pressed') },
        ]}
      >
        <Box twClassName="items-center">
          <Text variant={TextVariant.HeadingSm}>Custom Title</Text>
          <Text variant={TextVariant.BodySm}>Subtitle text</Text>
        </Box>
      </HeaderBase>
    </View>
  );
};

export const WithCustomChildren = {
  render: () => <WithCustomChildrenExample />,
};

// No accessories
const NoAccessoriesExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('p-4 bg-default')}>
      <HeaderBase>Simple Title</HeaderBase>
    </View>
  );
};

export const NoAccessories = {
  render: () => <NoAccessoriesExample />,
};

// Long title that may wrap
const LongTitleExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('p-4 bg-default')}>
      <HeaderBase
        startButtonIconProps={{
          iconName: IconName.ArrowLeft,
          onPress: () => console.log('Back pressed'),
        }}
        endButtonIconProps={[
          { iconName: IconName.Close, onPress: () => console.log('Close pressed') },
        ]}
      >
        This is a very long title that might need to wrap to multiple lines
      </HeaderBase>
    </View>
  );
};

export const LongTitle = {
  render: () => <LongTitleExample />,
};

// startAccessory takes priority over startButtonIconProps
const AccessoryPriorityExample = () => {
  const tw = useTailwind();

  return (
    <View style={tw.style('p-4 bg-default')}>
      <HeaderBase
        startAccessory={
          <Text variant={TextVariant.BodyMd}>Custom</Text>
        }
        startButtonIconProps={{
          iconName: IconName.ArrowLeft,
          onPress: () => console.log('This will not render'),
        }}
        endAccessory={
          <Text variant={TextVariant.BodyMd}>End</Text>
        }
        endButtonIconProps={[
          { iconName: IconName.Close, onPress: () => console.log('This will not render') },
        ]}
      >
        Accessory Priority
      </HeaderBase>
      <Text variant={TextVariant.BodySm} style={tw.style('mt-2 text-muted')}>
        startAccessory/endAccessory take priority over ButtonIconProps
      </Text>
    </View>
  );
};

export const AccessoryPriority = {
  render: () => <AccessoryPriorityExample />,
};

