/* eslint-disable no-console */
import React from 'react';
import { Text } from 'react-native';

import {
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
    showEndIconBackground: {
      control: 'boolean',
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

export const WithoutIconBackground = {
  render: () => (
    <SectionHeader
      title="Perpetuals"
      onPress={() => console.log('View all Perps')}
      showEndIconBackground={false}
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
