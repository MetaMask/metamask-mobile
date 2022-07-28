import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, boolean, text } from '@storybook/addon-knobs';

import AccountAvatar, { AccountAvatarType } from '../AccountAvatar';
import { BaseAvatarSize } from '../BaseAvatar';

import { AvatarBadgePosition } from './AvatarWithBadge.types';
import AvatarWithBadge from '.';

const groupId = 'Props';

storiesOf(' Component Library / AvatarWithBadge', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const accountAddress = text(
      'accountAddress',
      '0x10e08af911f2e489480fb2855b24771745d0198b50f5c55891369844a8c57092',
    );
    const showBadgeToggle = boolean('showBadge', true, groupId);
    const badgePositionSelector = select(
      'badgePosition',
      AvatarBadgePosition,
      AvatarBadgePosition.TopRight,
      groupId,
    );

    return (
      <AvatarWithBadge
        showBadge={showBadgeToggle}
        badgePosition={badgePositionSelector}
      >
        {/* TODO: fix children type */}
        <AccountAvatar
          type={AccountAvatarType.Blockies}
          accountAddress={accountAddress}
          size={BaseAvatarSize.Md}
        />
      </AvatarWithBadge>
    );
  });
