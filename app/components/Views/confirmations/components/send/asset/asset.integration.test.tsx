import type { AccountGroupAssets } from '@metamask/assets-controllers';
import { screen, within } from '@testing-library/react-native';

import { getAssetTestId } from '../../../../../UI/AssetElement/AssetElement.testIds';
import { renderSendAssetDropdown } from '../../../../../../../tests/integration/harnesses/send/send-component';

const SEPOLIA_ASSETS = {
  '0xaa36a7': [
    {
      accountType: 'eip155:eoa',
      address: '0x0000000000000000000000000000000000000000',
      assetId: 'eip155:11155111/slip44:60',
      balance: '1',
      chainId: '0xaa36a7',
      decimals: 18,
      fiat: {
        balance: 1000,
        conversionRate: 1000,
        currency: 'USD',
      },
      isNative: true,
      name: 'Sepolia Ether',
      rawBalance: '0xde0b6b3a7640000',
      symbol: 'SepoliaETH',
    },
  ],
} as unknown as AccountGroupAssets;

describe('Send asset picker', () => {
  it('hides Sepolia fiat prices when testnet fiat is disabled', () => {
    renderSendAssetDropdown({
      assets: SEPOLIA_ASSETS,
      fiatRate: 1000,
      showFiatOnTestnets: false,
    });

    const sepoliaAsset = screen.getByTestId(getAssetTestId('SepoliaETH'));

    expect(sepoliaAsset).toBeOnTheScreen();
    expect(within(sepoliaAsset).queryByText(/\$/u)).toBeNull();
  });

  it('shows Sepolia fiat prices when testnet fiat is enabled', () => {
    renderSendAssetDropdown({
      assets: SEPOLIA_ASSETS,
      fiatRate: 1000,
      showFiatOnTestnets: true,
    });

    const sepoliaAsset = screen.getByTestId(getAssetTestId('SepoliaETH'));

    expect(within(sepoliaAsset).getByText(/\$1,000/u)).toBeOnTheScreen();
  });
});
