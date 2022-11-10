/* eslint-disable import/prefer-default-export */
// Third party dependencies.
import { ImagePropsBase, ImageSourcePropType } from 'react-native';

// External dependencies.
import { NetworkProps } from '../../../../Networks/Network/Network.types';

export const TEST_REMOTE_IMAGE_SOURCE: ImageSourcePropType = {
  uri: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880',
};

const TEST_IMAGE_PROPS: ImagePropsBase = {
  source: TEST_REMOTE_IMAGE_SOURCE,
};

export const TEST_NETWORK_PROPS: NetworkProps = {
  imageProps: TEST_IMAGE_PROPS,
};

export const BADGE_NETWORK_TEST_ID = 'badge-network';
