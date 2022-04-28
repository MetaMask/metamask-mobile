import React from 'react';

import { storiesOf } from '@storybook/react-native';
import { select } from '@storybook/addon-knobs';

import BaseAvatar from './BaseAvatar';
import { AvatarSize } from './BaseAvatar.types';
import { Image } from 'react-native';
import { toDataUrl } from '../../../util/blockies';

// TODO: make sense of all this messy code
const getStrippedEnum = <T,>(collection: T) => {
  const allValues = Object.values(collection);
  const halfCollectionLength = allValues.length / 2;
  return allValues.reduce((accumulator, value, index) => {
    if (index >= halfCollectionLength) return accumulator;
    return {
      ...accumulator,
      [value]: allValues[halfCollectionLength + index].toString(),
    };
  }, {});
};

storiesOf('Base / BaseAvatar', module)
  .addDecorator((getStory) => getStory())
  .add('Simple', () => {
    const stubAddress = '0x310ff9e227946749ca32aC146215F352183F556b';
    const sizes = getStrippedEnum(AvatarSize);
    const sizeSelector = select('Size', sizes, AvatarSize.Medium.toString());

    return (
      <BaseAvatar size={Number(sizeSelector)}>
        <Image
          source={{ uri: toDataUrl(stubAddress) }}
          // eslint-disable-next-line react-native/no-inline-styles
          style={{ width: '100%', height: '100%' }}
        />
      </BaseAvatar>
    );
  });
