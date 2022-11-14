/* eslint-disable import/prefer-default-export */
// Third party dependencies.
import { ImagePropsBase, ImageSourcePropType } from 'react-native';

// Internal dependencies.
import { FaviconProps, FaviconSizes } from './Favicon.types';

// Defaults
export const DEFAULT_FAVICON_SIZE = FaviconSizes.Md;

// Test IDs
export const FAVICON_TEST_ID = 'favicon';
export const FAVICON_IMAGE_TEST_ID = 'favicon-image';

// Sample consts
const SAMPLE_FAVICON_IMAGE_URL = 'https://uniswap.org/favicon.ico';
const SAMPLE_FAVICON_IMAGE_SOURCE: ImageSourcePropType = {
  uri: SAMPLE_FAVICON_IMAGE_URL,
};
export const SAMPLE_FAVICON_IMAGE_PROPS: ImagePropsBase = {
  source: SAMPLE_FAVICON_IMAGE_SOURCE,
};
export const SAMPLE_FAVICON_PROPS: FaviconProps = {
  imageProps: SAMPLE_FAVICON_IMAGE_PROPS,
};
