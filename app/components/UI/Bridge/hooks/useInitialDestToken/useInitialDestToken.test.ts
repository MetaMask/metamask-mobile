import { initialState } from '../../_mocks_/initialState';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useInitialDestToken } from '.';
import { waitFor } from '@testing-library/react-native';
import { BridgeViewMode, BridgeToken } from '../../types';
import { DefaultSwapDestTokens } from '../../constants/default-swap-dest-tokens';
import { SolScope } from '@metamask/keyring-api';
import { selectChainId } from '../../../../../selectors/networkController';
import {
  selectBridgeViewMode,
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

  it('should not set dest token when source token address matches default token address', () => {
    const matchingSourceToken: BridgeToken = {
      ...mockSourceToken,
      address: DefaultSwapDestTokens[SolScope.Mainnet].address,
    };

    (selectBridgeViewMode as unknown as jest.Mock).mockReturnValue(
      BridgeViewMode.Swap,
    );
    (selectChainId as unknown as jest.Mock).mockReturnValue(SolScope.Mainnet);

    renderHookWithProvider(() => useInitialDestToken(matchingSourceToken), {
      state: initialState,
    });

    expect(setDestToken).toHaveBeenCalledWith({
      address: '0x456',
      symbol: 'NATIVE',
      decimals: 18,
      name: 'Native Token',
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    });
  });
});
