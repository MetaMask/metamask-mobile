/* eslint-disable no-console */
import React from 'react';

import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconColor,
} from '@metamask/design-system-react-native';

import HeaderRoot from './HeaderRoot';

const HeaderRootMeta = {
  title: 'Components Temp / HeaderRoot',
  component: HeaderRoot,
  argTypes: {
    title: {
      control: 'text',
    },
    twClassName: {
      control: 'text',
    },
  },
};

export default HeaderRootMeta;

export const Default = {
  args: {
    title: 'Header Title',
  },
};

export const WithTitleAccessory = {
  render: () => (
    <HeaderRoot
      title="Settings"
      titleAccessory={
        <Icon
          name={IconName.Info}
          color={IconColor.IconAlternative}
          twClassName="ml-1"
        />
      }
    />
  ),
};

export const WithChildren = {
  render: () => (
    <HeaderRoot
      endButtonIconProps={[
        {
          iconName: IconName.Close,
          onPress: () => console.log('Close pressed'),
        },
      ]}
    >
      <Box twClassName="items-start">
        <Text variant={TextVariant.HeadingSm}>Custom Title</Text>
        <Text variant={TextVariant.BodySm}>Subtitle text</Text>
      </Box>
    </HeaderRoot>
  ),
};

export const WithEndAccessory = {
  render: () => (
    <HeaderRoot
      title="Page Title"
      endAccessory={<Text variant={TextVariant.BodyMd}>Custom end</Text>}
    />
  ),
};

export const WithEndButtonIconProps = {
  render: () => (
    <HeaderRoot
      title="Search"
      endButtonIconProps={[
        {
          iconName: IconName.Close,
          onPress: () => console.log('Close pressed'),
        },
      ]}
    />
  ),
};

export const MultipleEndButtons = {
  render: () => (
    <HeaderRoot
      title="Search"
      endButtonIconProps={[
        {
          iconName: IconName.Search,
          onPress: () => console.log('Search pressed'),
        },
        {
          iconName: IconName.Close,
          onPress: () => console.log('Close pressed'),
        },
      ]}
    />
  ),
};
