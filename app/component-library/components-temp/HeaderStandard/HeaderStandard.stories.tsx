/* eslint-disable no-console */
import React from 'react';

import {
  Box,
  Text,
  TextVariant,
  IconName,
} from '@metamask/design-system-react-native';

import HeaderStandard from './HeaderStandard';

const HeaderStandardMeta = {
  title: 'Components Temp / HeaderStandard',
  component: HeaderStandard,
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

export default HeaderStandardMeta;

export const Default = {
  args: {
    title: 'Header Title',
  },
};

export const OnBack = {
  render: () => (
    <HeaderStandard
      title="Settings"
      onBack={() => console.log('Back pressed')}
    />
  ),
};

export const OnClose = {
  render: () => (
    <HeaderStandard
      title="Modal Title"
      onClose={() => console.log('Close pressed')}
    />
  ),
};

export const BackAndClose = {
  render: () => (
    <HeaderStandard
      title="Settings"
      onBack={() => console.log('Back pressed')}
      onClose={() => console.log('Close pressed')}
    />
  ),
};

export const WithSubtitle = {
  render: () => (
    <HeaderStandard
      title="Settings"
      subtitle="Account Settings"
      onBack={() => console.log('Back pressed')}
    />
  ),
};

export const MultipleEndButtons = {
  render: () => (
    <HeaderStandard
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

export const Children = {
  render: () => (
    <HeaderStandard onClose={() => console.log('Close pressed')}>
      <Box twClassName="items-center">
        <Text variant={TextVariant.HeadingSm}>Custom Title</Text>
        <Text variant={TextVariant.BodySm}>Subtitle text</Text>
      </Box>
    </HeaderStandard>
  ),
};
