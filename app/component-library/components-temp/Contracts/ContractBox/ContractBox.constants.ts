/* eslint-disable no-console */
import { ImageSourcePropType } from 'react-native';

const imageSource =
  'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880';

export const CONTRACT_ADDRESS = '0x2990079bcdEe240329a520d2444386FC119da21a';

// saved nickname for the contract
export const CONTRACT_PET_NAME = 'DAI';

// test id for the contract
export const CONTRACT_BOX_TEST_ID = 'contract-box';

// image for the contract
export const CONTRACT_LOCAL_IMAGE: ImageSourcePropType = {
  uri: imageSource,
};

// function that copies the contract address to the clipboard
export const CONTRACT_COPY_ADDRESS = () => {
  console.log('copy address');
};

// function that opens contract in block explorer if present
export const CONTRACT_EXPORT_ADDRESS = () => {
  console.log('export address');
};

// function that called when the user clicks on the contract name
export const CONTRACT_ON_PRESS = () => {
  console.log('contract pressed');
};

// determines if the contract has a block explorer
export const HAS_BLOCK_EXPLORER = true;

// first letter of the token symbol
export const TOKEN_SYMBOL = 'D';
