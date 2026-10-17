import React from 'react';

import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import TitleStandardMarketing from './TitleStandardMarketing';

const TitleStandardMarketingMeta = {
  title: 'Components Temp / TitleStandardMarketing',
  component: TitleStandardMarketing,
  argTypes: {
    title: {
      control: 'text',
    },
    bottomLabel: {
      control: 'text',
    },
  },
};

export default TitleStandardMarketingMeta;

export const Default = {
  args: {
    title: 'Import a wallet',
    bottomLabel: 'Enter your Secret Recovery Phrase',
  },
};

export const Title = {
  render: () => <TitleStandardMarketing title="Import a wallet" />,
};

export const TitleEndAccessory = {
  render: () => (
    <TitleStandardMarketing
      title="Import a wallet"
      titleEndAccessory={
        <Icon
          name={IconName.Info}
          size={IconSize.Md}
          color={IconColor.IconAlternative}
        />
      }
    />
  ),
};

export const TopAccessory = {
  render: () => (
    <TitleStandardMarketing
      topAccessory={
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          <Icon name={IconName.Wallet} size={IconSize.Sm} />
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            Step 1 of 3
          </Text>
        </Box>
      }
      title="Import a wallet"
    />
  ),
};

export const BottomLabel = {
  render: () => (
    <TitleStandardMarketing
      title="Import a wallet"
      bottomLabel="Enter your Secret Recovery Phrase"
    />
  ),
};

export const BottomLabelEndAccessory = {
  render: () => (
    <TitleStandardMarketing
      title="Import a wallet"
      bottomLabel="Enter your Secret Recovery Phrase"
      bottomLabelEndAccessory={
        <Icon
          name={IconName.Info}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      }
    />
  ),
};

export const BottomAccessory = {
  render: () => (
    <TitleStandardMarketing
      title="Import a wallet"
      bottomAccessory={
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          <Icon
            name={IconName.SecurityTick}
            size={IconSize.Sm}
            color={IconColor.SuccessDefault}
          />
          <Text variant={TextVariant.BodySm} color={TextColor.SuccessDefault}>
            Your phrase stays on this device
          </Text>
        </Box>
      }
    />
  ),
};
