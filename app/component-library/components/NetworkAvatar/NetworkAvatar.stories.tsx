import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';
import { BaseAvatarSize } from '../BaseAvatar';
import NetworkAvatar from '.';
import { imageUrl } from './NetworkAvatar.samples';

storiesOf(' Component Library / NetworkAvatar', module)
  .addDecorator((getStory) => getStory())
  .add('With image', () => {
    const sizeSelector = select('size', BaseAvatarSize, BaseAvatarSize.Md);
    const networkNameSelector = text('networkName', 'Ethereum');

    return (
      <NetworkAvatar
        size={sizeSelector}
        networkName={networkNameSelector}
        networkImageUrl={imageUrl}
      />
    );
  })
  .add('Without image', () => {
    const sizeSelector = select('size', BaseAvatarSize, BaseAvatarSize.Md);
    const networkNameSelector = text('networkName', 'Ethereum');

    return (
      <NetworkAvatar size={sizeSelector} networkName={networkNameSelector} />
    );
  });
