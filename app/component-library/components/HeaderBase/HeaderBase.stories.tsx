/* eslint-disable no-console */
import React from 'react';

import {
  Box,
  Text,
  TextVariant,
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';

import HeaderBase from './HeaderBase';
import { HeaderBaseVariant } from './HeaderBase.types';

const HeaderBaseMeta = {
  title: 'Component Library / HeaderBase',
  component: HeaderBase,
  argTypes: {
    children: {
      control: 'text',
    },
    variant: {
      control: 'select',
      options: Object.values(HeaderBaseVariant),
    },
    twClassName: {
      control: 'text',
    },
  },
};

export default HeaderBaseMeta;

export const Default = {
  args: {
    children: 'Header Title',
    variant: HeaderBaseVariant.Compact,
  },
};

export const Variant = {
  render: () => (
    <>
      <HeaderBase
        variant={HeaderBaseVariant.Compact}
        startAccessory={
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Md}
            onPress={() => console.log('Back pressed')}
          />
        }
        endAccessory={
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Md}
            onPress={() => console.log('Close pressed')}
          />
        }
      >
        Compact Variant
      </HeaderBase>
      <HeaderBase
        variant={HeaderBaseVariant.Display}
        startAccessory={
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Md}
            onPress={() => console.log('Back pressed')}
          />
        }
        endAccessory={
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Md}
            onPress={() => console.log('Close pressed')}
          />
        }
      >
        Display Variant
      </HeaderBase>
    </>
  ),
};

export const TwClassName = {
  render: () => (
    <HeaderBase twClassName="bg-info-default px-4">
      Header with Custom Styles
    </HeaderBase>
  ),
};

export const StartButtonIconProps = {
  render: () => (
    <HeaderBase
      startButtonIconProps={{
        iconName: IconName.ArrowLeft,
        onPress: () => console.log('Back pressed'),
      }}
    >
      With Start Button
    </HeaderBase>
  ),
};

export const EndButtonIconProps = {
  render: () => (
    <HeaderBase
      endButtonIconProps={[
        {
          iconName: IconName.Close,
          onPress: () => console.log('Close pressed'),
        },
      ]}
    >
      With End Button
    </HeaderBase>
  ),
};

export const MultipleEndButtonIconProps = {
  render: () => (
    <HeaderBase
      endButtonIconProps={[
        {
          iconName: IconName.Close,
          onPress: () => console.log('Close pressed'),
        },
        {
          iconName: IconName.Search,
          onPress: () => console.log('Search pressed'),
        },
        {
          iconName: IconName.Setting,
          onPress: () => console.log('Settings pressed'),
        },
      ]}
    >
      Multiple End Buttons
    </HeaderBase>
  ),
};

export const StartAccessory = {
  render: () => (
    <HeaderBase
      startAccessory={
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={() => console.log('Back pressed')}
        />
      }
    >
      With Start Accessory
    </HeaderBase>
  ),
};

export const EndAccessory = {
  render: () => (
    <HeaderBase
      endAccessory={
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Md}
          onPress={() => console.log('Close pressed')}
        />
      }
    >
      With End Accessory
    </HeaderBase>
  ),
};

export const BothAccessories = {
  render: () => (
    <HeaderBase
      startAccessory={
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={() => console.log('Back pressed')}
        />
      }
      endAccessory={
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Md}
          onPress={() => console.log('Close pressed')}
        />
      }
    >
      Both Accessories
    </HeaderBase>
  ),
};

export const Children = {
  render: () => (
    <HeaderBase
      startButtonIconProps={{
        iconName: IconName.ArrowLeft,
        onPress: () => console.log('Back pressed'),
      }}
    >
      <Box twClassName="items-center">
        <Text variant={TextVariant.HeadingSm}>Custom Title</Text>
        <Text variant={TextVariant.BodySm}>Subtitle text</Text>
      </Box>
    </HeaderBase>
  ),
};
