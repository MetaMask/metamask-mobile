/* eslint-disable import/prefer-default-export */
// Third party dependencies.
import { ImagePropsBase, ImageSourcePropType } from 'react-native';

// Internal dependencies.
import { FaviconSizes } from './Favicon.types';

const TEST_FAVICON_IMAGE_URL = 'https://uniswap.org/favicon.ico';

const TEST_REMOTE_IMAGE_SOURCE: ImageSourcePropType = {
  uri: TEST_FAVICON_IMAGE_URL,
};

export const TEST_FAVICON_IMAGE_PROPS: ImagePropsBase = {
  source: TEST_FAVICON_IMAGE_SOURCE,
};

export const DEFAULT_FAVICON_SIZE = FaviconSizes.Md;
