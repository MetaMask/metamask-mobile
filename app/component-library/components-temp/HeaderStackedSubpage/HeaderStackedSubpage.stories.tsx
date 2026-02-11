/* eslint-disable no-console */
import React from 'react';

import {
  Box,
  Text,
  TextVariant,
  IconName,
} from '@metamask/design-system-react-native';

import { AvatarSize } from '../../components/Avatars/Avatar/Avatar.types';
import AvatarToken from '../../components/Avatars/Avatar/variants/AvatarToken';
import { SAMPLE_AVATARTOKEN_PROPS } from '../../components/Avatars/Avatar/variants/AvatarToken/AvatarToken.constants';

import HeaderStackedSubpage from './HeaderStackedSubpage';

const HeaderStackedSubpageMeta = {
  title: 'Components Temp / HeaderStackedSubpage',
  component: HeaderStackedSubpage,
  argTypes: {
    twClassName: {
      control: 'text',
    },
  },
};

export default HeaderStackedSubpageMeta;

export const Default = {
  args: {
    titleSubpageProps: {
      title: 'Token Name',
      bottomLabel: '$1,234.56',
    },
  },
};

export const OnBack = {
  render: () => (
    <HeaderStackedSubpage
      onBack={() => console.log('Back pressed')}
      titleSubpageProps={{
        title: 'Token Name',
        bottomLabel: '$1,234.56',
      }}
    />
  ),
};

export const WithStartAccessory = {
  render: () => (
    <HeaderStackedSubpage
      onBack={() => console.log('Back pressed')}
      titleSubpageProps={{
        startAccessory: (
          <AvatarToken {...SAMPLE_AVATARTOKEN_PROPS} size={AvatarSize.Lg} />
        ),
        title: 'Wrapped Ethereum',
        bottomLabel: '$3,456.78',
      }}
    />
  ),
};

export const OnClose = {
  render: () => (
    <HeaderStackedSubpage
      onClose={() => console.log('Close pressed')}
      titleSubpageProps={{
        title: 'Token Name',
        bottomLabel: '$1,234.56',
      }}
    />
  ),
};

export const BackAndClose = {
  render: () => (
    <HeaderStackedSubpage
      onBack={() => console.log('Back pressed')}
      onClose={() => console.log('Close pressed')}
      titleSubpageProps={{
        title: 'Token Name',
        bottomLabel: '$1,234.56',
      }}
    />
  ),
};

export const EndButtonIconProps = {
  render: () => (
    <HeaderStackedSubpage
      onBack={() => console.log('Back pressed')}
      endButtonIconProps={[
        {
          iconName: IconName.Close,
          onPress: () => console.log('Close pressed'),
        },
      ]}
      titleSubpageProps={{
        title: 'Token Name',
        bottomLabel: '$1,234.56',
      }}
    />
  ),
};

export const BackButtonProps = {
  render: () => (
    <HeaderStackedSubpage
      backButtonProps={{
        onPress: () => console.log('Custom back pressed'),
      }}
      titleSubpageProps={{
        title: 'Token Name',
        bottomLabel: '$1,234.56',
      }}
    />
  ),
};

export const TitleSubpage = {
  render: () => (
    <HeaderStackedSubpage
      onBack={() => console.log('Back pressed')}
      titleSubpage={
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
    <HeaderStackedSubpage
      titleSubpageProps={{
        title: 'Token Name',
        bottomLabel: '+$123.45 (1.2%)',
      }}
    />
  ),
};
