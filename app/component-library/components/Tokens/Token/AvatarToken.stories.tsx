// Third party dependencies.
import React from 'react';
import { ImageSourcePropType } from 'react-native';
import { boolean, select, text } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../../component-library/constants/storybook.constants';
import {
  AvatarSizes,
  DEFAULT_AVATAR_SIZE,
} from '../../../../../../component-library/components/Avatars/Avatar';

// Internal dependencies.
import AvatarToken from './AvatarToken';
import {
  TEST_REMOTE_TOKEN_IMAGES,
  TEST_TOKEN_NAME,
} from './AvatarToken.constants';
import { AvatarTokenProps } from './AvatarToken.types';

export const getAvatarTokenStoryProps = (): AvatarTokenProps => {
  const sizeSelector = select(
    'size',
    AvatarSizes,
    DEFAULT_AVATAR_SIZE,
    storybookPropsGroupID,
  );

  const imageUrlSelector = select(
    'imageSource.uri',
    TEST_REMOTE_TOKEN_IMAGES,
    TEST_REMOTE_TOKEN_IMAGES[0],
    storybookPropsGroupID,
  );
  const image: ImageSourcePropType = {
    uri: imageUrlSelector,
  };

  const tokenNameSelector = text(
    'name',
    TEST_TOKEN_NAME,
    storybookPropsGroupID,
  );

  const isHaloEnabled = boolean('isHaloEnabled', false, storybookPropsGroupID);

  return {
    size: sizeSelector,
    name: tokenNameSelector,
    imageSource: image,
    isHaloEnabled,
  };
};

const AvatarTokenStory = () => <AvatarToken {...getAvatarTokenStoryProps()} />;

export default AvatarTokenStory;
