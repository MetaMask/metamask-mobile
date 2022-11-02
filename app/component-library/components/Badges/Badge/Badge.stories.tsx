// Third party dependencies.
import React from 'react';
import { select } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';
import BadgeAvatarStory, {
  getBadgeAvatarStoryProps,
} from './variants/BadgeAvatar/BadgeAvatar.stories';

// Internal dependencies.
import { BadgeVariants, BadgeProps } from './Badge.types';
import Badge from './Badge';

export const getBadgeStoryProps = (): BadgeProps => {
  let badgeProps: BadgeProps;

  const badgeVariantsSelector = select(
    'Badge Variant',
    BadgeVariants,
    BadgeVariants.Avatar,
    storybookPropsGroupID,
  );
  switch (badgeVariantsSelector) {
    case BadgeVariants.Avatar:
      badgeProps = {
        variant: BadgeVariants.Avatar,
        ...getBadgeAvatarStoryProps(),
      };
      break;
  }

  return badgeProps;
};
const BadgeStory = () => <Badge {...getBadgeStoryProps()} />;

storiesOf('Component Library / Badges', module)
  .add('Badge', BadgeStory)
  .add('Variants / BadgeAvatar', BadgeAvatarStory);

export default BadgeStory;
