/* eslint-disable no-console */
import React from 'react';

import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';

import TitleLeft from './TitleLeft';

const TitleLeftMeta = {
  title: 'Components Temp / TitleLeft',
  component: TitleLeft,
  argTypes: {
    title: {
      control: 'text',
    },
    topLabel: {
      control: 'text',
    },
    bottomLabel: {
      control: 'text',
    },
  },
};

export default TitleLeftMeta;

// Sample NFT image component for stories
const SampleNFTImage = () => (
  <Box twClassName="w-12 h-12 rounded-lg bg-success-muted items-center justify-center">
    <Text variant={TextVariant.BodySm}>NFT</Text>
  </Box>
);

export const Default = {
  args: {
    topLabel: 'Send',
    title: '$4.42',
  },
};

export const TitleOnly = {
  render: () => <TitleLeft title="$1,234.56" />,
};

export const WithTopLabel = {
  render: () => <TitleLeft topLabel="Total Balance" title="$5,432.10" />,
};

export const WithBottomLabel = {
  render: () => (
    <TitleLeft
      topLabel="Send"
      title="$4.42"
      bottomLabel="0.002 ETH"
      endAccessory={<SampleNFTImage />}
    />
  ),
};

export const WithTitleAccessory = {
  render: () => (
    <TitleLeft
      topLabel="Balance"
      title="$4.42"
      titleAccessory={
        <Box twClassName="ml-2">
          <Icon name={IconName.Info} size={IconSize.Sm} />
        </Box>
      }
    />
  ),
};

export const WithTopAccessory = {
  render: () => (
    <TitleLeft
      topAccessory={
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          <Icon name={IconName.Arrow2Up} size={IconSize.Sm} />
          <Text variant={TextVariant.BodySm}>Sending to</Text>
        </Box>
      }
      title="0x1234...5678"
      endAccessory={<SampleNFTImage />}
    />
  ),
};

export const WithBottomAccessory = {
  render: () => (
    <TitleLeft
      topLabel="Send"
      title="$4.42"
      bottomAccessory={
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          <Icon name={IconName.Gas} size={IconSize.Xs} />
          <Text variant={TextVariant.BodySm}>~$0.50 fee</Text>
        </Box>
      }
      endAccessory={<SampleNFTImage />}
    />
  ),
};

export const EndAccessory = {
  render: () => (
    <TitleLeft
      topLabel="Send"
      title="$4.42"
      endAccessory={<SampleNFTImage />}
    />
  ),
};

export const FullExample = {
  render: () => (
    <TitleLeft
      topLabel="Send"
      title="$4.42"
      titleAccessory={
        <Box twClassName="ml-1">
          <Icon name={IconName.Info} size={IconSize.Sm} />
        </Box>
      }
      bottomLabel="0.002 ETH"
      endAccessory={<SampleNFTImage />}
    />
  ),
};

export const NoEndAccessory = {
  render: () => (
    <TitleLeft
      topLabel="Account Balance"
      title="$12,345.67"
      bottomLabel="+$123.45 (1.2%)"
    />
  ),
};
