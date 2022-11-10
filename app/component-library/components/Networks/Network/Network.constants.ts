/* eslint-disable import/prefer-default-export */

// Third party dependencies.
import { ImagePropsBase, ImageSourcePropType } from 'react-native';

// Internal dependencies.
import { NetworkSizes } from './Network.types';

export const TEST_NETWORK_NAME = 'Ethereum';

const TEST_REMOTE_IMAGE_SOURCE: ImageSourcePropType = {
  uri: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880',
};

export const TEST_REMOTE_IMAGE_PROPS: ImagePropsBase = {
  source: TEST_REMOTE_IMAGE_SOURCE,
};

export const DEFAULT_NETWORK_SIZE = NetworkSizes.Md;
