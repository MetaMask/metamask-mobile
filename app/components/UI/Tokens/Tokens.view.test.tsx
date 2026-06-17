import '../../../../tests/component-view/mocks';
import { renderTokenList } from '../../../../tests/component-view/renderers/networkManager';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { waitFor } from '@testing-library/react-native';

describeForPlatforms('Tokens — network filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // E2E test 8: "should filter tokens by selected network from list of enabled popular networks"
  // Proves: when only Ethereum is enabled, ETH is visible and Polygon tokens are not.
  // The full selector chain filters by NetworkEnablementController.enabledNetworkMap.
  it('shows ETH when Ethereum is enabled and hides Polygon tokens', async () => {
    const { findByTestId, queryByTestId } = renderTokenList({
      enabledNetworks: { eip155: { '0x1': true } },
      activeEvmChainId: '0x1',
    });

    // ETH native token should be visible (filtered to Ethereum)
    const ethToken = await findByTestId('asset-ETH', undefined, {
      timeout: 10000,
    });
    expect(ethToken).toBeOnTheScreen();

    // Polygon native token should NOT be visible
    await waitFor(() => {
      expect(queryByTestId('asset-POL')).not.toBeOnTheScreen();
    });
  });

  // E2E test 9: "should filter tokens by custom enabled networks"
  // Proves: when Sepolia (custom testnet) is enabled, mainnet tokens are NOT visible.
  it('hides mainnet tokens when custom network (Sepolia) is enabled', async () => {
    const { queryByTestId } = renderTokenList({
      enabledNetworks: { eip155: { '0xaa36a7': true } },
      activeEvmChainId: '0xaa36a7',
    });

    // Mainnet tokens should NOT be visible when filtered to Sepolia
    await waitFor(
      () => {
        expect(queryByTestId('asset-ETH')).not.toBeOnTheScreen();
        expect(queryByTestId('asset-USDC')).not.toBeOnTheScreen();
      },
      { timeout: 5000 },
    );
  });

  // E2E test 7: "should filter tokens by Solana" (adapted — proves USDC also appears on Ethereum)
  // Proves: both native ETH and ERC20 USDC render when Ethereum is the enabled network.
  it('shows both ETH and USDC when Ethereum is enabled', async () => {
    const { findByTestId } = renderTokenList({
      enabledNetworks: { eip155: { '0x1': true } },
      activeEvmChainId: '0x1',
    });

    const ethToken = await findByTestId('asset-ETH', undefined, {
      timeout: 10000,
    });
    expect(ethToken).toBeOnTheScreen();

    const usdcToken = await findByTestId('asset-USDC', undefined, {
      timeout: 5000,
    });
    expect(usdcToken).toBeOnTheScreen();
  });
});
