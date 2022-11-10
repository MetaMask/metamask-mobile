/* eslint-disable import/prefer-default-export */
import { FaviconSizes, ImagePropsBase } from './Favicon.types';

// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

const TEST_REMOTE_IMAGE_URL = 'https://uniswap.org/favicon.ico';

const TEST_REMOTE_IMAGE_SOURCE: ImageSourcePropType = {
  uri: TEST_REMOTE_IMAGE_URL,
};

export const TEST_REMOTE_IMAGE_PROPS: ImagePropsBase = {
  source: TEST_REMOTE_IMAGE_SOURCE,
};

export const DEFAULT_FAVICON_SIZE = FaviconSizes.Md;
