import React from 'react';

import { storiesOf } from '@storybook/react-native';
import { select } from '@storybook/addon-knobs';

import BaseAvatar from './BaseAvatar';
import { BaseAvatarSize } from './BaseAvatar.types';
import { Image } from 'react-native';
import { toDataUrl } from '../../../util/blockies';

storiesOf('Component Library / BaseAvatar', module)
  .addDecorator((getStory) => getStory())
  .add('Simple', () => {
    const stubAddress = '0x310ff9e227946749ca32aC146215F352183F556b';
    const sizeSelector = select('Size', BaseAvatarSize, BaseAvatarSize.Md);
    const imageStyle = { flex: 1 };

    return (
      <BaseAvatar size={sizeSelector}>
        <Image source={{ uri: toDataUrl(stubAddress) }} style={imageStyle} />
      </BaseAvatar>
    );
  });
