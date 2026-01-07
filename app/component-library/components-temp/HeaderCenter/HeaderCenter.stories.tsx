/* eslint-disable no-console */
import React from 'react';

import {
  Box,
  Text,
  TextVariant,
  IconName,
} from '@metamask/design-system-react-native';

import HeaderCenter from './HeaderCenter';

const HeaderCenterMeta = {
  title: 'Components Temp / HeaderCenter',
  component: HeaderCenter,
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

export default HeaderCenterMeta;

export const Default = {
  args: {
    title: 'Header Title',
  },
};

export const OnBack = {
  render: () => (
    <HeaderCenter title="Settings" onBack={() => console.log('Back pressed')} />
  ),
};

export const OnClose = {
  render: () => (
    <HeaderCenter
      title="Modal Title"
      onClose={() => console.log('Close pressed')}
    />
  ),
};

export const BackAndClose = {
  render: () => (
    <HeaderCenter
      title="Settings"
      onBack={() => console.log('Back pressed')}
      onClose={() => console.log('Close pressed')}
    />
  ),
};

export const WithSubtitle = {
  render: () => (
    <HeaderCenter
      title="Settings"
      subtitle="Account Settings"
      onBack={() => console.log('Back pressed')}
    />
  ),
};

export const MultipleEndButtons = {
  render: () => (
    <HeaderCenter
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
    <HeaderCenter onClose={() => console.log('Close pressed')}>
      <Box twClassName="items-center">
        <Text variant={TextVariant.HeadingSm}>Custom Title</Text>
        <Text variant={TextVariant.BodySm}>Subtitle text</Text>
      </Box>
    </HeaderCenter>
  ),
};
