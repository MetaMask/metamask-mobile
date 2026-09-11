import { initialState } from '../../_mocks_/initialState';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useInitialDestToken } from '.';
import { waitFor } from '@testing-library/react-native';
import { BridgeViewMode, BridgeToken } from '../../types';
import { getSwapDestToken } from '../../utils/getSwapDestToken';
import { SolScope, BtcScope } from '@metamask/keyring-api';
import { selectChainId } from '../../../../../selectors/networkController';
import {
  selectBip44DefaultPair,
  selectBridgeViewMode,
  selectSourceToken,
  setDestToken,
} from '../../../../../core/redux/slices/bridge';

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
    selectSourceToken: jest.fn(actual.selectSourceToken),
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
    // clearAllMocks leaves implementations in place, so restore the selectors
    // individual tests stub out to their real ones.
    const actualSlice = jest.requireActual(
      '../../../../../core/redux/slices/bridge',
    );
    (selectBip44DefaultPair as unknown as jest.Mock).mockImplementation(
      actualSlice.selectBip44DefaultPair,
    );
    (selectSourceToken as unknown as jest.Mock).mockImplementation(
      actualSlice.selectSourceToken,
    );
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
        getSwapDestToken(SolScope.Mainnet),
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
        getSwapDestToken(SolScope.Mainnet),
      );
    });
  });

  it('derives the dest token from the selected source token when none comes in on the route', async () => {
    // A tab switch can leave the source token anchored to a chain other than
    // the wallet's selected one, so the dest default must follow the source.
    (selectBridgeViewMode as unknown as jest.Mock).mockReturnValue(
      BridgeViewMode.Unified,
    );
    (selectChainId as unknown as jest.Mock).mockReturnValue('0x1');
    (selectBip44DefaultPair as unknown as jest.Mock).mockReturnValue(undefined);
    (selectSourceToken as unknown as jest.Mock).mockReturnValue({
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'POL',
      decimals: 18,
      name: 'Polygon',
      chainId: '0x89',
    });

    renderHookWithProvider(() => useInitialDestToken(), {
      state: initialState,
    });

    await waitFor(() => {
      expect(setDestToken).toHaveBeenCalledWith(getSwapDestToken('0x89'));
    });
  });

  it('sets the bip44 default pair dest asset when no source token is anchored yet', async () => {
    // Fresh Swaps entry: useInitialSourceToken applies the pair's source asset,
    // so the pair's dest asset is the matching half.
    (selectBridgeViewMode as unknown as jest.Mock).mockReturnValue(
      BridgeViewMode.Unified,
    );
    (selectChainId as unknown as jest.Mock).mockReturnValue('0x1');
    (selectSourceToken as unknown as jest.Mock).mockReturnValue(undefined);

    renderHookWithProvider(() => useInitialDestToken(), {
      state: initialState,
    });

    await waitFor(() => {
      expect(setDestToken).toHaveBeenCalledWith(
        expect.objectContaining({ symbol: 'mUSD', chainId: '0x1' }),
      );
    });
  });

  it('keeps the dest token on the source chain when the source is only set in Redux', async () => {
    // Switching Bridge tabs clears the dest token but leaves the source
    // anchored to the previous tab's chain. The bip44 pair's dest asset always
    // lives on Ethereum, so pairing it with such a source would silently turn a
    // same-chain swap into a cross-chain bridge.
    (selectBridgeViewMode as unknown as jest.Mock).mockReturnValue(
      BridgeViewMode.Unified,
    );
    (selectChainId as unknown as jest.Mock).mockReturnValue('0x1');
    (selectSourceToken as unknown as jest.Mock).mockReturnValue({
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'BNB',
      decimals: 18,
      name: 'BNB',
      chainId: '0x38',
    });

    renderHookWithProvider(() => useInitialDestToken(), {
      state: initialState,
    });

    await waitFor(() => {
      expect(setDestToken).toHaveBeenCalledWith(getSwapDestToken('0x38'));
    });
    expect(setDestToken).not.toHaveBeenCalledWith(
      expect.objectContaining({ chainId: '0x1' }),
    );
  });

  describe('BIP44 Bitcoin functionality', () => {
    it('should set bip44 default pair dest asset when source token is Bitcoin and bip44DefaultPair exists', async () => {
      // Arrange - Bitcoin source token from Asset Details page
      (selectBridgeViewMode as unknown as jest.Mock).mockReturnValue(
        BridgeViewMode.Unified,
      );
      // Set chainId to Bitcoin to ensure correct bip44 pair selection
      (selectChainId as unknown as jest.Mock).mockReturnValue(BtcScope.Mainnet);

      // Act - Bitcoin source token
      renderHookWithProvider(
        () => useInitialDestToken(mockBitcoinSourceToken),
        { state: initialState },
      );

      // Assert - Should set Ethereum as destination token based on bip44DefaultPair
      await waitFor(() => {
        expect(setDestToken).toHaveBeenCalledWith({
          symbol: 'ETH',
          name: 'Ethereum',
          address: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          image:
            'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
          chainId: '0x1',
        });
      });
    });

    it('should set bip44 default pair dest asset when the Bitcoin source token only comes from Redux', async () => {
      // Bitcoin has no same-chain swap dest, so its default pair is Ethereum's
      // asset whether the source arrives on the route or is already in Redux.
      (selectBridgeViewMode as unknown as jest.Mock).mockReturnValue(
        BridgeViewMode.Unified,
      );
      (selectChainId as unknown as jest.Mock).mockReturnValue(BtcScope.Mainnet);
      (selectSourceToken as unknown as jest.Mock).mockReturnValue(
        mockBitcoinSourceToken,
      );

      renderHookWithProvider(() => useInitialDestToken(), {
        state: initialState,
      });

      await waitFor(() => {
        expect(setDestToken).toHaveBeenCalledWith(
          expect.objectContaining({ symbol: 'ETH', chainId: '0x1' }),
        );
      });
    });
  });
});
