/* eslint-disable no-console */
import React from 'react';

import {
  Box,
  Text,
  TextVariant,
  IconName,
} from '@metamask/design-system-react-native';

import HeaderWithTitleLeft from './HeaderWithTitleLeft';

const HeaderWithTitleLeftMeta = {
  title: 'Components Temp / HeaderWithTitleLeft',
  component: HeaderWithTitleLeft,
  argTypes: {
    twClassName: {
      control: 'text',
    },
  },
};

export default HeaderWithTitleLeftMeta;

const SampleNFTImage = () => (
  <Box twClassName="w-12 h-12 rounded-lg bg-success-muted items-center justify-center">
    <Text variant={TextVariant.BodySm}>NFT</Text>
  </Box>
);

export const Default = {
  args: {
    titleLeftProps: {
      topLabel: 'Send',
      title: '$4.42',
    },
  },
};

export const OnBack = {
  render: () => (
    <HeaderWithTitleLeft
      onBack={() => console.log('Back pressed')}
      titleLeftProps={{
        topLabel: 'Send',
        title: '$4.42',
        endAccessory: <SampleNFTImage />,
      }}
    />
  ),
};

export const WithBottomLabel = {
  render: () => (
    <HeaderWithTitleLeft
      onBack={() => console.log('Back pressed')}
      titleLeftProps={{
        topLabel: 'Send',
        title: '$4.42',
        bottomLabel: '0.002 ETH',
        endAccessory: <SampleNFTImage />,
      }}
    />
  ),
};

export const OnClose = {
  render: () => (
    <HeaderWithTitleLeft
      onClose={() => console.log('Close pressed')}
      titleLeftProps={{
        topLabel: 'Send',
        title: '$4.42',
        endAccessory: <SampleNFTImage />,
      }}
    />
  ),
};

export const BackAndClose = {
  render: () => (
    <HeaderWithTitleLeft
      onBack={() => console.log('Back pressed')}
      onClose={() => console.log('Close pressed')}
      titleLeftProps={{
        topLabel: 'Send',
        title: '$4.42',
        endAccessory: <SampleNFTImage />,
      }}
    />
  ),
};

export const EndButtonIconProps = {
  render: () => (
    <HeaderWithTitleLeft
      onBack={() => console.log('Back pressed')}
      endButtonIconProps={[
        {
          iconName: IconName.Close,
          onPress: () => console.log('Close pressed'),
        },
      ]}
      titleLeftProps={{
        topLabel: 'Send',
        title: '$4.42',
        endAccessory: <SampleNFTImage />,
      }}
    />
  ),
};

export const BackButtonProps = {
  render: () => (
    <HeaderWithTitleLeft
      backButtonProps={{
        onPress: () => console.log('Custom back pressed'),
      }}
      titleLeftProps={{
        topLabel: 'Receive',
        title: '$1,234.56',
      }}
    />
  ),
};

export const TitleLeft = {
  render: () => (
    <HeaderWithTitleLeft
      onBack={() => console.log('Back pressed')}
      titleLeft={
        <Box twClassName="px-4 py-2">
          <Text variant={TextVariant.HeadingMd}>Custom Title Section</Text>
          <Text variant={TextVariant.BodySm}>
            This is a completely custom title section
          </Text>
        </Box>
      }
    />
  ),
};

export const NoBackButton = {
  render: () => (
    <HeaderWithTitleLeft
      titleLeftProps={{
        topLabel: 'Account Balance',
        title: '$12,345.67',
        bottomLabel: '+$123.45 (1.2%)',
      }}
    />
  ),
};
