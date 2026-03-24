/* eslint-disable no-console */
import React from 'react';

import {
  Box,
  Text,
  TextVariant,
  IconName,
} from '@metamask/design-system-react-native';

import HeaderCompactStandard from './HeaderCompactStandard';

const HeaderCompactStandardMeta = {
  title: 'Components Temp / HeaderCompactStandard',
  component: HeaderCompactStandard,
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

export default HeaderCompactStandardMeta;

export const Default = {
  args: {
    title: 'Header Title',
  },
};

export const OnBack = {
  render: () => (
    <HeaderCompactStandard
      title="Settings"
      onBack={() => console.log('Back pressed')}
    />
  ),
};

export const OnClose = {
  render: () => (
    <HeaderCompactStandard
      title="Modal Title"
      onClose={() => console.log('Close pressed')}
    />
  ),
};

export const BackAndClose = {
  render: () => (
    <HeaderCompactStandard
      title="Settings"
      onBack={() => console.log('Back pressed')}
      onClose={() => console.log('Close pressed')}
    />
  ),
};

export const WithSubtitle = {
  render: () => (
    <HeaderCompactStandard
      title="Settings"
      subtitle="Account Settings"
      onBack={() => console.log('Back pressed')}
    />
  ),
};

export const MultipleEndButtons = {
  render: () => (
    <HeaderCompactStandard
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
    <HeaderCompactStandard onClose={() => console.log('Close pressed')}>
      <Box twClassName="items-center">
        <Text variant={TextVariant.HeadingSm}>Custom Title</Text>
        <Text variant={TextVariant.BodySm}>Subtitle text</Text>
      </Box>
    </HeaderCompactStandard>
  ),
};
