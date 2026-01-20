import { initialState } from '../../_mocks_/initialState';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useInitialDestToken } from '.';
import { waitFor } from '@testing-library/react-native';
import { BridgeViewMode, BridgeToken } from '../../types';
import { DefaultSwapDestTokens } from '../../constants/default-swap-dest-tokens';
import { SolScope, BtcScope } from '@metamask/keyring-api';
import { selectChainId } from '../../../../../selectors/networkController';
import {
  selectBridgeViewMode,
  setDestToken,
  selectBip44DefaultPair,
} from '../../../../../core/redux/slices/bridge';
import { CHAIN_IDS } from '@metamask/transaction-controller';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => {
  const actual = jest.requireActual('../../../../../core/redux/slices/bridge');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    setDestToken: jest.fn(actual.setDestToken),
    selectBridgeViewMode: jest.fn().mockReturnValue('Bridge'),
    selectBip44DefaultPair: jest.fn(actual.selectBip44DefaultPair),
  };
});

jest.mock('../../../../../selectors/networkController', () => {
  const actual = jest.requireActual(
    '../../../../../selectors/networkController',
  );
  return {
    ...actual,
    selectChainId: jest.fn(actual.selectChainId),
  };
});

jest.mock('../useInitialSourceToken', () => ({
  getNativeSourceToken: jest.fn().mockReturnValue({
    address: '0x456',
    symbol: 'NATIVE',
    decimals: 18,
    name: 'Native Token',
    chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  }),
}));

describe('useInitialDestToken', () => {
  const mockSourceToken: BridgeToken = {
    address: '0x123',
    symbol: 'MOCK',
    decimals: 18,
    name: 'Mock Token',
    chainId: SolScope.Mainnet,
  };

  const mockBitcoinSourceToken: BridgeToken = {
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    symbol: 'BTC',
    decimals: 8,
    name: 'Bitcoin',
    chainId: BtcScope.Mainnet,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not set dest token when not in swap mode', () => {
    (selectBridgeViewMode as unknown as jest.Mock).mockReturnValue(
      BridgeViewMode.Bridge,
    );

    renderHookWithProvider(() => useInitialDestToken(mockSourceToken), {
      state: initialState,
    });

    expect(setDestToken).not.toHaveBeenCalled();
  });

  it('should set default dest token when in swap mode and default token exists', async () => {
    (selectBridgeViewMode as unknown as jest.Mock).mockReturnValue(
      BridgeViewMode.Swap,
    );
    (selectChainId as unknown as jest.Mock).mockReturnValue(SolScope.Mainnet);

    renderHookWithProvider(() => useInitialDestToken(mockSourceToken), {
      state: initialState,
    });

    await waitFor(() => {
      expect(setDestToken).toHaveBeenCalledWith(
        DefaultSwapDestTokens[SolScope.Mainnet],
      );
    });
  });

  it('should set default dest token when in unified mode and default token exists', async () => {
    (selectBridgeViewMode as unknown as jest.Mock).mockReturnValue(
      BridgeViewMode.Unified,
    );
    (selectChainId as unknown as jest.Mock).mockReturnValue(SolScope.Mainnet);

    renderHookWithProvider(() => useInitialDestToken(mockSourceToken), {
      state: initialState,
    });

    await waitFor(() => {
      expect(setDestToken).toHaveBeenCalledWith(
        DefaultSwapDestTokens[SolScope.Mainnet],
      );
    });
  });

  describe('BIP44 Bitcoin functionality', () => {
    it('should set bip44 default pair dest asset when source token is Bitcoin and bip44DefaultPair exists', async () => {
      // Arrange - Bitcoin source token from Asset Details page
      (selectBridgeViewMode as unknown as jest.Mock).mockReturnValue(
        BridgeViewMode.Unified,
      );
      // Set chainId to Bitcoin to ensure correct bip44 pair selection
      (selectChainId as unknown as jest.Mock).mockReturnValue(BtcScope.Mainnet);

      // Mock selectBip44DefaultPair to return the expected BTC->ETH pair
      // (The actual selector depends on chainId which we can't properly mock through its internals)
      const expectedEthDestAsset = {
        symbol: 'ETH',
        name: 'Ethereum',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        image:
          'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
        chainId: CHAIN_IDS.MAINNET,
      };
      (selectBip44DefaultPair as unknown as jest.Mock).mockReturnValue({
        sourceAsset: {
          symbol: 'BTC',
          name: 'Bitcoin',
          address: '0x0000000000000000000000000000000000000000',
          decimals: 8,
          image:
            'https://static.cx.metamask.io/api/v2/tokenIcons/assets/bip122/000000000019d6689c085ae165831e93/slip44/0.png',
          chainId: BtcScope.Mainnet,
        },
        destAsset: expectedEthDestAsset,
      });

      // Act - Bitcoin source token
      renderHookWithProvider(
        () => useInitialDestToken(mockBitcoinSourceToken),
        { state: initialState },
      );

      // Assert - Should set Ethereum as destination token based on bip44DefaultPair
      await waitFor(() => {
        expect(setDestToken).toHaveBeenCalledWith(expectedEthDestAsset);
      });
    });
  });
});
