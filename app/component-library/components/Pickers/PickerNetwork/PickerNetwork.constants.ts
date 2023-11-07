/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
// Internal dependencies.
import { PickerNetworkProps } from './PickerNetwork.types';

// Sample consts
export const SAMPLE_PICKERNETWORK_PROPS: PickerNetworkProps = {
  imageSource: {
    uri: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880',
  },
  label: 'Ethereum Mainnet',
  onPress: () => console.log('PickerNetwork pressed'),
};

export const DEFAULT_ACTIVE_OPACITY = 0.2;
export const WITHOUT_FEEDBACK_ACTIVE_OPACITY = 1;
