/* eslint-disable import/prefer-default-export */

// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

export const TEST_NETWORK_NAME = 'Ethereum';

export const TEST_REMOTE_IMAGE_SOURCE: ImageSourcePropType = {
  uri: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880',
};

/* eslint-disable-next-line */
export const TEST_LOCAL_IMAGE_SOURCE: ImageSourcePropType = require('../../../../../../images/ethereum.png');
