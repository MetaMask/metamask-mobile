/* eslint-disable import/prefer-default-export */

// Third party dependences.
import { ImageSourcePropType } from 'react-native';

export const TOKEN_AVATAR_IMAGE_ID = 'token-avatar-image';

export const TEST_TOKEN_NAME = 'Wrapped Ethereum';

export const TEST_REMOTE_TOKEN_IMAGES = [
  'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
  'https://cryptologos.cc/logos/bnb-bnb-logo.png',
  'https://cryptologos.cc/logos/chainlink-link-logo.png',
  'https://cryptologos.cc/logos/decentraland-mana-logo.png',
  'https://cryptologos.cc/logos/polygon-matic-logo.png',
  'https://cryptologos.cc/logos/uniswap-uni-logo.png',
  'https://cryptologos.cc/logos/curve-dao-token-crv-logo.png',
  'https://cryptologos.cc/logos/vechain-vet-logo.png',
];

export const TEST_REMOTE_IMAGE_SOURCE: ImageSourcePropType = {
  uri: TEST_REMOTE_TOKEN_IMAGES[0],
};

/* eslint-disable-next-line */
export const TEST_LOCAL_IMAGE_SOURCE: ImageSourcePropType = require('../../../../../../images/ethereum.png');
