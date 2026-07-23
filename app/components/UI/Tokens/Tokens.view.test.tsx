import '../../../../tests/component-view/mocks';
import { renderTokenList } from '../../../../tests/component-view/renderers/networkManager';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { act, waitFor } from '@testing-library/react-native';
import { getAssetTestId } from '../../../../tests/selectors/Wallet/WalletView.selectors';

/** Flushes Tokens' InteractionManager callback so its list replaces loading skeleton. */
const waitForTokenListLoad = async () => {
  await act(async () => {
    await new Promise(setImmediate);
  });
};

describeForPlatforms('Tokens — network filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // E2E test 8: "should filter tokens by selected network from list of enabled popular networks"
  // Proves: when only Ethereum is enabled, ETH is visible and Polygon tokens are not.
  // The full selector chain filters by NetworkEnablementController.enabledNetworkMap.
  it('shows ETH when Ethereum is enabled and hides Polygon tokens', async () => {
    const { getByTestId, queryByTestId } = renderTokenList({
      enabledNetworks: { eip155: { '0x1': true } },
      activeEvmChainId: '0x1',
    });

    await waitForTokenListLoad();

    const ethToken = getByTestId(getAssetTestId('ETH'));
    expect(ethToken).toBeOnTheScreen();

    // Polygon native token should NOT be visible
    await waitFor(() => {
      expect(queryByTestId(getAssetTestId('POL'))).not.toBeOnTheScreen();
    });
  });

  // E2E test 9: "should filter tokens by custom enabled networks"
  // Proves: when Sepolia (custom testnet) is enabled, mainnet tokens are NOT visible.
  it('hides mainnet tokens when custom network (Sepolia) is enabled', async () => {
    const { queryByTestId } = renderTokenList({
      enabledNetworks: { eip155: { '0xaa36a7': true } },
      activeEvmChainId: '0xaa36a7',
    });

    await waitForTokenListLoad();

    // Mainnet tokens should NOT be visible when filtered to Sepolia
    await waitFor(
      () => {
        expect(queryByTestId(getAssetTestId('ETH'))).not.toBeOnTheScreen();
        expect(queryByTestId(getAssetTestId('USDC'))).not.toBeOnTheScreen();
      },
      { timeout: 5000 },
    );
  });

  // E2E test 7: "should filter tokens by Solana" (adapted — proves USDC also appears on Ethereum)
  // Proves: both native ETH and ERC20 USDC render when Ethereum is the enabled network.
  it('shows both ETH and USDC when Ethereum is enabled', async () => {
    const { getByTestId } = renderTokenList({
      enabledNetworks: { eip155: { '0x1': true } },
      activeEvmChainId: '0x1',
    });

    await waitForTokenListLoad();

    const ethToken = getByTestId(getAssetTestId('ETH'));
    expect(ethToken).toBeOnTheScreen();

    const usdcToken = getByTestId(getAssetTestId('USDC'));
    expect(usdcToken).toBeOnTheScreen();
  });
});
