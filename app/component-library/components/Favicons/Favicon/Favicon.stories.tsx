// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../component-library/constants/storybook.constants';

// Internal dependencies.
import Favicon from './Favicon';
import {
  DEFAULT_FAVICON_SIZE,
  TEST_REMOTE_IMAGE_PROPS,
} from './Favicon.constants';
import { FaviconProps, FaviconSizes } from './Favicon.types';

export const getFaviconStoryProps = (): FaviconProps => {
  const sizeSelector = select(
    'size',
    FaviconSizes,
    DEFAULT_FAVICON_SIZE,
    storybookPropsGroupID,
  );

  return {
    size: sizeSelector,
    imageProps: TEST_REMOTE_IMAGE_PROPS,
  };
};
const FaviconStory = () => <Favicon {...getFaviconStoryProps()} />;

storiesOf('Component Library / Favicons', module).add('Favicon', FaviconStory);

export default FaviconStory;
