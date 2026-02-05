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
  IconColor,
} from '@metamask/design-system-react-native';

import TitleStandard from './TitleStandard';

const TitleStandardMeta = {
  title: 'Components Temp / TitleStandard',
  component: TitleStandard,
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

export default TitleStandardMeta;

export const Default = {
  args: {
    topLabel: 'Send',
    title: '$4.42',
  },
};

export const TitleOnly = {
  render: () => <TitleStandard title="$1,234.56" />,
};

export const WithTopLabel = {
  render: () => <TitleStandard topLabel="Total Balance" title="$5,432.10" />,
};

export const WithBottomLabel = {
  render: () => (
    <TitleStandard topLabel="Send" title="$4.42" bottomLabel="0.002 ETH" />
  ),
};

export const WithTitleAccessory = {
  render: () => (
    <TitleStandard
      topLabel="Balance"
      title="$4.42"
      titleAccessory={
        <Box twClassName="ml-2">
          <Icon
            name={IconName.Info}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        </Box>
      }
    />
  ),
};

export const WithTopAccessory = {
  render: () => (
    <TitleStandard
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
    />
  ),
};

export const WithBottomAccessory = {
  render: () => (
    <TitleStandard
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
    />
  ),
};

export const FullExample = {
  render: () => (
    <TitleStandard
      topLabel="Send"
      title="$4.42"
      titleAccessory={
        <Box twClassName="ml-1">
          <Icon name={IconName.Info} size={IconSize.Sm} />
        </Box>
      }
      bottomLabel="0.002 ETH"
    />
  ),
};

export const NoEndAccessory = {
  render: () => (
    <TitleStandard
      topLabel="Account Balance"
      title="$12,345.67"
      bottomLabel="+$123.45 (1.2%)"
    />
  ),
};
