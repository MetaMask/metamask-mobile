/* eslint-disable no-console */
// 3rd party dependencies
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select } from '@storybook/addon-knobs';

// External dependencies
import AccountAvatar, { AccountAvatarType } from '../AccountAvatar';
import { BaseAvatarSize } from '../BaseAvatar';
import Tag from '../Tag';

// Internal dependencies
import Badge from './Badge';
import { BadgePositionVariant } from './Badge.types';

storiesOf('Component Library / Badge', module).add('Default', () => {
  const groupId = 'Props';
  const position = select(
    'position',
    BadgePositionVariant,
    BadgePositionVariant.TopRight,
    groupId,
  );

  const sampleTag = <Tag label={'Tag'} />;
  const sampleAccountAvatar = (
    <AccountAvatar
      size={BaseAvatarSize.Md}
      type={AccountAvatarType.JazzIcon}
      accountAddress={
        '0x10e08af911f2e489480fb2855b24771745d0198b50f5c55891369844a8c57092'
      }
    />
  );

  const sampleComponents: any = {
    tag: sampleTag,
    accountAvatar: sampleAccountAvatar,
  };
  const sampleComponentsKeys = Object.keys(sampleComponents);

  const badgeContentKey = select(
    'badgeContent',
    sampleComponentsKeys,
    sampleComponentsKeys[0],
    groupId,
  );

  const badgeContent = sampleComponents[badgeContentKey];

  return (
    <Badge badgeContent={badgeContent} position={position}>
      <Tag label={'Children'} />
    </Badge>
  );
});
