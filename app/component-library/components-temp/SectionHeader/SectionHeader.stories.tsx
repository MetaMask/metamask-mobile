/* eslint-disable no-console */
import React from 'react';
import { Text } from 'react-native';

import {
  BoxJustifyContent,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';

import SectionHeader from './SectionHeader';

const SectionHeaderMeta = {
  title: 'Components Temp / SectionHeader',
  component: SectionHeader,
  argTypes: {
    title: {
      control: 'text',
    },
    twClassName: {
      control: 'text',
    },
  },
};

export default SectionHeaderMeta;

export const Default = {
  args: {
    title: 'Tokens',
    onPress: () => console.log('View all pressed'),
  },
};

export const StaticNoPress = {
  render: () => <SectionHeader title="Portfolio" />,
};

export const WithEndAccessory = {
  render: () => (
    <SectionHeader
      title="DeFi"
      onPress={() => console.log('View all DeFi')}
      endAccessory={
        <Icon
          name={IconName.Info}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      }
    />
  ),
};

export const WithReactNodeTitle = {
  render: () => (
    <SectionHeader
      title={<Text>Custom Node Title</Text>}
      onPress={() => console.log('Pressed')}
    />
  ),
};

export const WithCustomEndIcon = {
  render: () => (
    <SectionHeader
      title="NFTs"
      onPress={() => console.log('View all NFTs')}
      endIconName={IconName.Arrow2Right}
    />
  ),
};

export const WithCustomEndIconColor = {
  render: () => (
    <SectionHeader
      title="Perps"
      onPress={() => console.log('View all Perps')}
      endIconColor={IconColor.IconDefault}
    />
  ),
};

export const WithJustifyContentBetween = {
  render: () => (
    <SectionHeader
      title="Your positions"
      justifyContent={BoxJustifyContent.Between}
      endAccessory={
        <Icon
          name={IconName.MoreVertical}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      }
    />
  ),
};

export const FullExample = {
  render: () => (
    <SectionHeader
      title="Tokens"
      onPress={() => console.log('View all tokens')}
      endAccessory={
        <Icon
          name={IconName.Info}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      }
    />
  ),
};
