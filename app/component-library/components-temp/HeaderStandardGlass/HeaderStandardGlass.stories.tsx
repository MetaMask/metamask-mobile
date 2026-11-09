/* eslint-disable no-console */
import React from 'react';

import {
  Box,
  Text,
  TextVariant,
  IconName,
} from '@metamask/design-system-react-native';

import HeaderStandardGlass from './HeaderStandardGlass';

const HeaderStandardGlassMeta = {
  title: 'Components Temp / HeaderStandardGlass',
  component: HeaderStandardGlass,
  argTypes: {
    title: {
      control: 'text',
    },
    subtitle: {
      control: 'text',
    },
    isGlass: {
      control: 'boolean',
    },
    twClassName: {
      control: 'text',
    },
  },
};

export default HeaderStandardGlassMeta;

export const Default = {
  args: {
    title: 'Header title',
  },
};

export const OnBack = {
  render: () => (
    <HeaderStandardGlass
      title="Settings"
      onBack={() => console.log('Back pressed')}
    />
  ),
};

export const OnClose = {
  render: () => (
    <HeaderStandardGlass
      title="Modal title"
      onClose={() => console.log('Close pressed')}
    />
  ),
};

export const BackAndClose = {
  render: () => (
    <HeaderStandardGlass
      title="Settings"
      onBack={() => console.log('Back pressed')}
      onClose={() => console.log('Close pressed')}
    />
  ),
};

export const WithSubtitle = {
  render: () => (
    <HeaderStandardGlass
      title="Settings"
      subtitle="Account settings"
      onBack={() => console.log('Back pressed')}
    />
  ),
};

export const MultipleEndButtons = {
  render: () => (
    <HeaderStandardGlass
      title="Search"
      onBack={() => console.log('Back pressed')}
      endButtonIconProps={[
        {
          iconName: IconName.Search,
          onPress: () => console.log('Search pressed'),
        },
      ]}
      onClose={() => console.log('Close pressed')}
    />
  ),
};

export const PlainIcons = {
  render: () => (
    <HeaderStandardGlass
      isGlass={false}
      title="Settings"
      onBack={() => console.log('Back pressed')}
      onClose={() => console.log('Close pressed')}
    />
  ),
};

export const Children = {
  render: () => (
    <HeaderStandardGlass onClose={() => console.log('Close pressed')}>
      <Box twClassName="items-center">
        <Text variant={TextVariant.HeadingSm}>Custom title</Text>
        <Text variant={TextVariant.BodySm}>Subtitle text</Text>
      </Box>
    </HeaderStandardGlass>
  ),
};
