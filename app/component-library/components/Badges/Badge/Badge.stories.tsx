/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { select } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';
import BadgeNetworkStory, {
  getBadgeNetworkStoryProps,
} from './variants/BadgeNetwork/BadgeNetwork.stories';
import BadgeStatusStory, {
  getBadgeStatusStoryProps,
} from './variants/BadgeStatus/BadgeStatus.stories';

// Internal dependencies.
import { BadgeVariant, BadgeProps } from './Badge.types';
import Badge from './Badge';

export const getBadgeStoryProps = (): BadgeProps => {
  let badgeProps: BadgeProps;

  const badgeVariantSelector = select(
    'variant',
    BadgeVariant,
    BadgeVariant.Network,
    storybookPropsGroupID,
  );
  switch (badgeVariantSelector) {
    case BadgeVariant.Network:
      badgeProps = {
        variant: BadgeVariant.Network,
        ...getBadgeNetworkStoryProps(),
      };
      break;
    case BadgeVariant.Status:
      badgeProps = {
        variant: BadgeVariant.Status,
        ...getBadgeStatusStoryProps(),
      };
      break;
  }
  return badgeProps;
};
const BadgeStory = () => (
  <View
    // eslint-disable-next-line react-native/no-inline-styles
    style={{
      height: 50,
      width: 50,
    }}
  >
    <Badge {...getBadgeStoryProps()} />
  </View>
);

storiesOf('Component Library / Badges', module)
  .add('Badge', BadgeStory)
  .add('Variants / BadgeNetwork', BadgeNetworkStory)
  .add('Variants / BadgeStatus', BadgeStatusStory);

export default BadgeStory;
