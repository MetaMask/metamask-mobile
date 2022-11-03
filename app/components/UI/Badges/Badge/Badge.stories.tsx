// Third party dependencies.
import React from 'react';
import { select } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { storybookPropsGroupID } from 'app/component-library/constants/storybook.constants';
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
        ...getBadgeAvatarStoryProps(),
      };
      break;
  }

  return badgeProps;
};
const BadgeStory = () => <Badge {...getBadgeStoryProps()} />;

storiesOf('Components / UI / Badges', module)
  .add('Badge', BadgeStory)
  .add('Variants / BadgeAvatar', BadgeAvatarStory);

export default BadgeStory;
