import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select } from '@storybook/addon-knobs';
import { BaseAvatarSize } from '../BaseAvatar';
import AccountAvatar, { AccountAvatarType } from '../AccountAvatar';
import StackedAvatar from '.';

storiesOf(' Component Library / StackedAvatar', module).add('Default', () => {
  const sizeSelector = select('size', BaseAvatarSize, BaseAvatarSize.Md);

  const avatarList = [
    TokenAvatar,
    TokenAvatar,
    TokenAvatar,
    AccountAvatar,
    AccountAvatar,
    AccountAvatar,
    AccountAvatar,
    AccountAvatar,
  ];

  return <StackedAvatar size={sizeSelector} avatarList={avatarList} />;
});
