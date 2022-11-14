/* eslint-disable import/prefer-default-export */
// Third party dependences.
import { ImagePropsBase, ImageSourcePropType } from 'react-native';

// Internal dependencies.
import { TokenProps, TokenSizes } from './Token.types';

// Defaults
export const DEFAULT_TOKEN_SIZE = TokenSizes.Md;

// Test IDs
export const TOKEN_TEST_ID = 'token';
export const TOKEN_HALO_TEST_ID = 'token-halo';
export const TOKEN_IMAGE_TEST_ID = 'token-image';

// Sample consts
export const SAMPLE_TOKEN_NAME = 'Wrapped Ethereum';
export const SAMPLE_TOKEN_IMAGES = [
  'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
  'https://cryptologos.cc/logos/bnb-bnb-logo.png',
  'https://cryptologos.cc/logos/chainlink-link-logo.png',
  'https://cryptologos.cc/logos/decentraland-mana-logo.png',
  'https://cryptologos.cc/logos/polygon-matic-logo.png',
  'https://cryptologos.cc/logos/uniswap-uni-logo.png',
  'https://cryptologos.cc/logos/curve-dao-token-crv-logo.png',
  'https://cryptologos.cc/logos/vechain-vet-logo.png',
];
const SAMPLE_TOKEN_IMAGE_SOURCE: ImageSourcePropType = {
  uri: SAMPLE_TOKEN_IMAGES[0],
};
export const SAMPLE_TOKEN_IMAGE_PROPS: ImagePropsBase = {
  source: SAMPLE_TOKEN_IMAGE_SOURCE,
};
export const SAMPLE_TOKEN_PROPS: TokenProps = {
  imageProps: SAMPLE_TOKEN_IMAGE_PROPS,
};
