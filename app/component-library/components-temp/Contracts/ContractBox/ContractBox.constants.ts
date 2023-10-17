/* eslint-disable no-console */
import { ImageSourcePropType } from 'react-native';

const imageSource =
  'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880';

export const CONTRACT_PET_NAME = 'DAI';
export const CONTRACT_BOX_TEST_ID = 'contract-box';
export const CONTRACT_LOCAL_IMAGE: ImageSourcePropType = {
  uri: imageSource,
};

export const CONTRACT_COPY_ADDRESS = () => {
  console.log('copy address');
};

export const CONTRACT_EXPORT_ADDRESS = () => {
  console.log('export address');
};

export const CONTRACT_ON_PRESS = () => {
  console.log('contract pressed');
};

export const HAS_BLOCK_EXPLORER = true;
export const TOKEN_SYMBOL = 'D';
