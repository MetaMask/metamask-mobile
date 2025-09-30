import { MultichainAddressRowProps } from './MultichainAddressRow.types';
import { IconName } from '@metamask/design-system-react-native';

export const MULTICHAIN_ADDRESS_ROW_TEST_ID = 'multichain-address-row';
export const MULTICHAIN_ADDRESS_ROW_NETWORK_ICON_TEST_ID =
  'multichain-address-row-network-icon';
export const MULTICHAIN_ADDRESS_ROW_NETWORK_NAME_TEST_ID =
  'multichain-address-row-network-name';
export const MULTICHAIN_ADDRESS_ROW_ADDRESS_TEST_ID =
  'multichain-address-row-address';
export const MULTICHAIN_ADDRESS_ROW_COPY_BUTTON_TEST_ID =
  'multichain-address-row-copy-button';
export const MULTICHAIN_ADDRESS_ROW_QR_BUTTON_TEST_ID =
  'multichain-address-row-qr-button';

export const SAMPLE_ICONS = [
  {
    name: IconName.QrCode,
    callback: () => {
      // Do nothing
    },
    testId: MULTICHAIN_ADDRESS_ROW_QR_BUTTON_TEST_ID,
  },
];

export const SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS: MultichainAddressRowProps = {
  chainId: 'eip155:1',
  networkName: 'Ethereum Mainnet',
  address: '0x1234567890123456789012345678901234567890',
  icons: SAMPLE_ICONS,
};
