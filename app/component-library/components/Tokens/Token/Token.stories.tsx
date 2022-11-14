// Third party dependencies.
import React from 'react';
import { ImagePropsBase, ImageSourcePropType } from 'react-native';
import { boolean, select, text } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { storybookPropsGroupID } from '../../../../component-library/constants/storybook.constants';

// Internal dependencies.
import Token from './Token';
import {
  DEFAULT_TOKEN_SIZE,
  TEST_TOKEN_IMAGES,
  TEST_TOKEN_NAME,
} from './Token.constants';
import { TokenProps, TokenSizes } from './Token.types';

export const getTokenStoryProps = (): TokenProps => {
  const sizeSelector = select(
    'size',
    TokenSizes,
    DEFAULT_TOKEN_SIZE,
    storybookPropsGroupID,
  );

  const imageUrlSelector = select(
    'imageSource.uri',
    TEST_TOKEN_IMAGES,
    TEST_TOKEN_IMAGES[0],
    storybookPropsGroupID,
  );
  const imageSource: ImageSourcePropType = {
    uri: imageUrlSelector,
  };
  const imageProps: ImagePropsBase = {
    source: imageSource,
  };

  const tokenNameSelector = text(
    'name',
    TEST_TOKEN_NAME,
    storybookPropsGroupID,
  );

  const isHaloEnabled = boolean('isHaloEnabled', true, storybookPropsGroupID);

  return {
    size: sizeSelector,
    name: tokenNameSelector,
    imageProps,
    isHaloEnabled,
  };
};

const TokenStory = () => <Token {...getTokenStoryProps()} />;

storiesOf('Component Library / Tokens', module).add('Token', TokenStory);

export default TokenStory;
