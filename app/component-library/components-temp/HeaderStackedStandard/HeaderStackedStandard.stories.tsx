/* eslint-disable no-console */
import React from 'react';

import {
  Box,
  Text,
  TextVariant,
  IconName,
} from '@metamask/design-system-react-native';

import HeaderStackedStandard from './HeaderStackedStandard';

const HeaderStackedStandardMeta = {
  title: 'Components Temp / HeaderStackedStandard',
  component: HeaderStackedStandard,
  argTypes: {
    twClassName: {
      control: 'text',
    },
  },
};

export default HeaderStackedStandardMeta;

export const Default = {
  args: {
    titleStandardProps: {
      topLabel: 'Send',
      title: '$4.42',
    },
  },
};

export const OnBack = {
  render: () => (
    <HeaderStackedStandard
      onBack={() => console.log('Back pressed')}
      titleStandardProps={{
        topLabel: 'Send',
        title: '$4.42',
      }}
    />
  ),
};

export const WithBottomLabel = {
  render: () => (
    <HeaderStackedStandard
      onBack={() => console.log('Back pressed')}
      titleStandardProps={{
        topLabel: 'Send',
        title: '$4.42',
        bottomLabel: '0.002 ETH',
      }}
    />
  ),
};

export const OnClose = {
  render: () => (
    <HeaderStackedStandard
      onClose={() => console.log('Close pressed')}
      titleStandardProps={{
        topLabel: 'Send',
        title: '$4.42',
      }}
    />
  ),
};

export const BackAndClose = {
  render: () => (
    <HeaderStackedStandard
      onBack={() => console.log('Back pressed')}
      onClose={() => console.log('Close pressed')}
      titleStandardProps={{
        topLabel: 'Send',
        title: '$4.42',
      }}
    />
  ),
};

export const EndButtonIconProps = {
  render: () => (
    <HeaderStackedStandard
      onBack={() => console.log('Back pressed')}
      endButtonIconProps={[
        {
          iconName: IconName.Close,
          onPress: () => console.log('Close pressed'),
        },
      ]}
      titleStandardProps={{
        topLabel: 'Send',
        title: '$4.42',
      }}
    />
  ),
};

export const BackButtonProps = {
  render: () => (
    <HeaderStackedStandard
      backButtonProps={{
        onPress: () => console.log('Custom back pressed'),
      }}
      titleStandardProps={{
        topLabel: 'Receive',
        title: '$1,234.56',
      }}
    />
  ),
};

export const TitleStandard = {
  render: () => (
    <HeaderStackedStandard
      onBack={() => console.log('Back pressed')}
      titleStandard={
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
    <HeaderStackedStandard
      titleStandardProps={{
        topLabel: 'Account Balance',
        title: '$12,345.67',
        bottomLabel: '+$123.45 (1.2%)',
      }}
    />
  ),
};
