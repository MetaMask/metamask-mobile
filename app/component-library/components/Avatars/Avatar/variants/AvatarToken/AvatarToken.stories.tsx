// Third party dependencies.
import React from 'react';
import { ImageSourcePropType } from 'react-native';
import { boolean, select, text } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { AvatarSize } from '../../Avatar.types';

// Internal dependencies.
import AvatarToken from './AvatarToken';
import {
  TEST_LOCAL_IMAGE_SOURCE,
  TEST_REMOTE_TOKEN_IMAGES,
  TEST_TOKEN_NAME,
} from './AvatarToken.constants';
import { AvatarTokenProps } from './AvatarToken.types';

export const getAvatarTokenStoryProps = (): AvatarTokenProps => {
  const sizeSelector = select(
    'size',
    AvatarSize,
    AvatarSize.Md,
    storybookPropsGroupID,
  );
  const imgSourceOptions = {
    Remote: 'REMOTE',
    Local: 'LOCAL',
  };

  const imgSourceSelector = select(
    'imageSource.uri Source',
    imgSourceOptions,
    imgSourceOptions.Remote,
    storybookPropsGroupID,
  );

  let image: ImageSourcePropType;

  if (imgSourceSelector === imgSourceOptions.Local) {
    image = TEST_LOCAL_IMAGE_SOURCE;
  } else {
    const imageUrlSelector = select(
      'imageSource.uri',
      TEST_REMOTE_TOKEN_IMAGES,
      TEST_REMOTE_TOKEN_IMAGES[0],
      storybookPropsGroupID,
    );
    image = {
      uri: imageUrlSelector,
    };
  }
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
