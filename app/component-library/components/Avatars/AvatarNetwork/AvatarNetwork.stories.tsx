// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';

// External dependencies.
import { AvatarBaseSize } from '../AvatarBase';

// Internal dependencies.
import AvatarNetwork from './AvatarNetwork';
import { TEST_IMAGE_URL } from './AvatarNetwork.constants';

storiesOf(' Component Library / AvatarNetwork', module)
  .addDecorator((getStory) => getStory())
  .add('With image', () => {
    const sizeSelector = select('size', AvatarBaseSize, AvatarBaseSize.Md);
    const networkNameSelector = text('networkName', 'Ethereum');

    return (
      <AvatarNetwork
        size={sizeSelector}
        networkName={networkNameSelector}
        networkImageUrl={TEST_IMAGE_URL}
      />
    );
  })
  .add('Without image', () => {
    const sizeSelector = select('size', AvatarBaseSize, AvatarBaseSize.Md);
    const networkNameSelector = text('networkName', 'Ethereum');

    return (
      <AvatarNetwork size={sizeSelector} networkName={networkNameSelector} />
    );
  })
  .add('Without image and networkName', () => {
    const sizeSelector = select('size', AvatarBaseSize, AvatarBaseSize.Md);

    return <AvatarNetwork size={sizeSelector} />;
  });
