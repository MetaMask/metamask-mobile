/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
// Internal dependencies.
import { PickerNetworkProps } from './PickerNetwork.types';

// Test IDs
export const PICKERNETWORK_ARROW_TESTID = 'pickernetwork-arrow';

// Sample consts
export const SAMPLE_PICKERNETWORK_PROPS: PickerNetworkProps = {
  imageSource: {
    uri: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880',
  },
  label: 'Ethereum Mainnet',
  onPress: () => console.log('PickerNetwork pressed'),
};
