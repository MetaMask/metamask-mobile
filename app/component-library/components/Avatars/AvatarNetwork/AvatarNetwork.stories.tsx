// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';

// External dependencies.
import { AvatarBaseSize } from '../AvatarBase';

// Internal dependencies.
import AvatarNetwork from './AvatarNetwork';
import { TEST_IMAGE_SOURCE } from './AvatarNetwork.constants';

storiesOf(' Component Library / AvatarNetwork', module)
  .addDecorator((getStory) => getStory())
  .add('With image', () => {
    const sizeSelector = select('size', AvatarBaseSize, AvatarBaseSize.Md);
    const networkNameSelector = text('name', 'Ethereum');

    return (
      <AvatarNetwork
        size={sizeSelector}
        name={networkNameSelector}
        imageSource={TEST_IMAGE_SOURCE}
      />
    );
  })
  .add('Without image', () => {
    const sizeSelector = select('size', AvatarBaseSize, AvatarBaseSize.Md);
    const networkNameSelector = text('networkName', 'Ethereum');

    return <AvatarNetwork size={sizeSelector} name={networkNameSelector} />;
  })
  .add('Without image and networkName', () => {
    const sizeSelector = select('size', AvatarBaseSize, AvatarBaseSize.Md);

    return <AvatarNetwork size={sizeSelector} />;
  });
