import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';
import { AvatarSize } from '../Avatar';
import NetworkAvatar from '.';
import { testImageUrl } from './NetworkAvatar.data';

storiesOf(' Component Library / NetworkAvatar', module)
  .addDecorator((getStory) => getStory())
  .add('With image', () => {
    const sizeSelector = select('size', AvatarSize, AvatarSize.Md);
    const networkNameSelector = text('networkName', 'Ethereum');

    return (
      <NetworkAvatar
        size={sizeSelector}
        networkName={networkNameSelector}
        networkImageUrl={testImageUrl}
      />
    );
  })
  .add('Without image', () => {
    const sizeSelector = select('size', AvatarSize, AvatarSize.Md);
    const networkNameSelector = text('networkName', 'Ethereum');

    return (
      <NetworkAvatar size={sizeSelector} networkName={networkNameSelector} />
    );
  })
  .add('Without image and networkName', () => {
    const sizeSelector = select('size', AvatarSize, AvatarSize.Md);

    return <NetworkAvatar size={sizeSelector} />;
  });
