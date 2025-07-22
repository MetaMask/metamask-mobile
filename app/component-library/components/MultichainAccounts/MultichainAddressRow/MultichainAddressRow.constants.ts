import { MultichainAddressRowProps } from './MultichainAddressRow.types';
import { ProviderConfig } from '../../../../selectors/networkController';

export const SAMPLE_MULTICHAIN_ADDRESS_ROW_PROPS: MultichainAddressRowProps = {
  network: {
    nickname: 'Ethereum Mainnet',
    chainId: '0x1',
    ticker: 'ETH',
    type: 'mainnet',
    rpcPrefs: {},
  } as ProviderConfig,
  address: '0x1234567890123456789012345678901234567890',
};

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
