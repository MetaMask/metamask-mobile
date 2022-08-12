// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';

// External dependencies.
import { AvatarBaseSize } from '../AvatarBase';

// Internal dependencies.
import AvatarNetwork from './AvatarNetwork';
import {
  TEST_REMOTE_IMAGE_SOURCE,
  TEST_LOCAL_IMAGE_SOURCE,
  TEST_NETWORK_NAME,
} from './AvatarNetwork.constants';

storiesOf(' Component Library / AvatarNetwork', module)
  .addDecorator((getStory) => getStory())
  .add('With remote image', () => {
    const sizeSelector = select('size', AvatarBaseSize, AvatarBaseSize.Md);
    const networkNameSelector = text('name', TEST_NETWORK_NAME);

    return (
      <AvatarNetwork
        size={sizeSelector}
        name={networkNameSelector}
        imageSource={TEST_REMOTE_IMAGE_SOURCE}
      />
    );
  })
  .add('With local image', () => (
    <AvatarNetwork
      size={AvatarBaseSize.Lg}
      name={TEST_NETWORK_NAME}
      imageSource={TEST_LOCAL_IMAGE_SOURCE}
    />
  ))
  .add('Without image', () => {
    const sizeSelector = select('size', AvatarBaseSize, AvatarBaseSize.Md);
    const networkNameSelector = text('name', TEST_NETWORK_NAME);

    return <AvatarNetwork size={sizeSelector} name={networkNameSelector} />;
  })
  .add('Without image and name', () => {
    const sizeSelector = select('size', AvatarBaseSize, AvatarBaseSize.Md);

    return <AvatarNetwork size={sizeSelector} />;
  });
