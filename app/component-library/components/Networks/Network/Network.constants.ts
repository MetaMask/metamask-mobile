/* eslint-disable import/prefer-default-export */

// Third party dependencies.
import { ImagePropsBase, ImageSourcePropType } from 'react-native';

// Internal dependencies.
import { NetworkProps, NetworkSizes } from './Network.types';

// Defaults
export const DEFAULT_NETWORK_SIZE = NetworkSizes.Md;

// Test IDs
export const NETWORK_TEST_ID = 'network';
export const NETWORK_IMAGE_TEST_ID = 'network-image';

// Test consts
export const TEST_NETWORK_NAME = 'Ethereum';
const TEST_NETWORK_IMAGE_SOURCE: ImageSourcePropType = {
  uri: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880',
};
export const TEST_NETWORK_IMAGE_PROPS: ImagePropsBase = {
  source: TEST_NETWORK_IMAGE_SOURCE,
};
export const TEST_NETWORK_PROPS: NetworkProps = {
  imageProps: TEST_NETWORK_IMAGE_PROPS,
};
