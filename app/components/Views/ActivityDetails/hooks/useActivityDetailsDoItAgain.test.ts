import { renderHook } from '@testing-library/react-native';
import {
  canRenderActivityDetailsDoItAgain,
  useActivityDetailsDoItAgain,
} from './useActivityDetailsDoItAgain';
import Routes from '../../../../constants/navigation/Routes';
import type { TokenAmount } from '../../../../util/activity-adapters';
import { useTokensWithBalance } from '../../../UI/Bridge/hooks/useTokensWithBalance';
import { setSourceAmount } from '../../../../core/redux/slices/bridge';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({ useDispatch: () => mockDispatch }));

jest.mock('../../../UI/Bridge/hooks/useTokensWithBalance', () => ({
  useTokensWithBalance: jest.fn(() => []),
}));
const mockUseTokensWithBalance = jest.mocked(useTokensWithBalance);

const sourceToken = {
  amount: '1000000000000000000',
  decimals: 18,
  symbol: 'ETH',
  assetId: 'eip155:1/slip44:60',
  direction: 'out',
} as TokenAmount;

const destinationToken = {
  amount: '1000000',
  decimals: 6,
  symbol: 'USDC',
  assetId: 'eip155:1/erc20:0xabc',
  direction: 'in',
} as TokenAmount;

describe('useActivityDetailsDoItAgain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTokensWithBalance.mockReturnValue([]);
  });

  it('navigates to the bridge view with the mapped source/destination tokens', () => {
    const { result } = renderHook(() =>
      useActivityDetailsDoItAgain({
        sourceToken,
        destinationToken,
        fallbackCaipChainId: 'eip155:1',
      }),
    );

    result.current();

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.BRIDGE.ROOT,
      expect.objectContaining({
        screen: Routes.BRIDGE.BRIDGE_VIEW,
        params: expect.objectContaining({
          sourceToken: expect.objectContaining({ symbol: 'ETH' }),
          destToken: expect.objectContaining({ symbol: 'USDC' }),
        }),
      }),
    );
    // "Swap again" opens with an empty amount (no reused source amount), and
    // any stale amount in the Bridge slice is cleared.
    expect(mockNavigate.mock.calls[0][1].params.sourceAmount).toBeUndefined();
    expect(mockDispatch).toHaveBeenCalledWith(setSourceAmount(undefined));
  });

  it('hydrates a token from the user holdings (icon + balance) when it is held', () => {
    const heldUsdt = {
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      symbol: 'USDT',
      decimals: 6,
      chainId: 'eip155:137',
      image: 'https://example.com/usdt.png',
      balance: '25.0',
      tokenFiatAmount: 25,
    };
    mockUseTokensWithBalance.mockReturnValue([heldUsdt] as ReturnType<
      typeof useTokensWithBalance
    >);

    const polygonDai = {
      amount: '10000000000000000',
      decimals: 18,
      symbol: 'DAI',
      assetId: 'eip155:137/erc20:0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
      direction: 'out',
    } as TokenAmount;
    const polygonUsdt = {
      amount: '9922',
      decimals: 6,
      symbol: 'USDT',
      assetId: 'eip155:137/erc20:0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      direction: 'in',
    } as TokenAmount;

    const { result } = renderHook(() =>
      useActivityDetailsDoItAgain({
        sourceToken: polygonDai,
        destinationToken: polygonUsdt,
        fallbackCaipChainId: 'eip155:137',
      }),
    );

    result.current();

    // The held USDT resolves to a real token (icon + balance); the un-held DAI
    // falls back to the skeleton (symbol only).
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.BRIDGE.ROOT,
      expect.objectContaining({
        params: expect.objectContaining({
          destToken: expect.objectContaining({
            symbol: 'USDT',
            image: 'https://example.com/usdt.png',
            balance: '25.0',
          }),
          sourceToken: expect.objectContaining({ symbol: 'DAI' }),
        }),
      }),
    );
  });

  it('matches a Polygon native leg (0x…1010) against the held holding normalized to 0x0', () => {
    const heldPol = {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'POL',
      decimals: 18,
      chainId: 'eip155:137',
      image: 'https://example.com/pol.png',
      balance: '5.0',
      tokenFiatAmount: 5,
    };
    mockUseTokensWithBalance.mockReturnValue([heldPol] as ReturnType<
      typeof useTokensWithBalance
    >);

    const polygonNative = {
      amount: '1000000000000000000',
      decimals: 18,
      symbol: 'POL',
      // The activity API can represent Polygon native as the 0x…1010 system contract.
      assetId: 'eip155:137/erc20:0x0000000000000000000000000000000000001010',
      direction: 'out',
    } as TokenAmount;

    const { result } = renderHook(() =>
      useActivityDetailsDoItAgain({
        sourceToken: polygonNative,
        fallbackCaipChainId: 'eip155:137',
      }),
    );

    result.current();

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.BRIDGE.ROOT,
      expect.objectContaining({
        params: expect.objectContaining({
          sourceToken: expect.objectContaining({
            symbol: 'POL',
            image: 'https://example.com/pol.png',
            balance: '5.0',
          }),
        }),
      }),
    );
  });

  it('hydrates a non-EVM (Solana) swap leg from held tokens even though the activity row has no decimals', () => {
    const heldSol = {
      address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
      symbol: 'SOL',
      decimals: 9,
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      image: 'https://example.com/sol.png',
      balance: '2.5',
      tokenFiatAmount: 250,
    };
    const heldUsdc = {
      address:
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      symbol: 'USDC',
      decimals: 6,
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      image: 'https://example.com/usdc.png',
      balance: '42.0',
      tokenFiatAmount: 42,
    };
    mockUseTokensWithBalance.mockReturnValue([heldSol, heldUsdc] as ReturnType<
      typeof useTokensWithBalance
    >);

    // Solana activity rows carry a symbol + asset id but no decimals.
    const solSource = {
      amount: '1000000000',
      symbol: 'SOL',
      assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
      direction: 'out',
    } as TokenAmount;
    const usdcDest = {
      amount: '42000000',
      symbol: 'USDC',
      assetId:
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      direction: 'in',
    } as TokenAmount;

    const { result } = renderHook(() =>
      useActivityDetailsDoItAgain({
        sourceToken: solSource,
        destinationToken: usdcDest,
        fallbackCaipChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      }),
    );

    result.current();

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.BRIDGE.ROOT,
      expect.objectContaining({
        params: expect.objectContaining({
          // Real decimals (9 / 6) come from the held tokens, not the 0
          // placeholder the skeleton carries for non-EVM rows.
          sourceToken: expect.objectContaining({
            symbol: 'SOL',
            decimals: 9,
            image: 'https://example.com/sol.png',
            balance: '2.5',
          }),
          destToken: expect.objectContaining({
            symbol: 'USDC',
            decimals: 6,
            balance: '42.0',
          }),
        }),
      }),
    );
  });

  it('does nothing when the source token cannot be mapped to a bridge token', () => {
    const { result } = renderHook(() =>
      useActivityDetailsDoItAgain({
        sourceToken: undefined,
        fallbackCaipChainId: 'eip155:1',
      }),
    );

    result.current();

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('canRenderActivityDetailsDoItAgain', () => {
  it('returns true for a token with a symbol and decimals', () => {
    expect(canRenderActivityDetailsDoItAgain(sourceToken, 'eip155:1')).toBe(
      true,
    );
  });

  it('returns false when there is no token', () => {
    expect(canRenderActivityDetailsDoItAgain(undefined, 'eip155:1')).toBe(
      false,
    );
  });

  it('returns true for a non-EVM (Solana) token with a symbol but no decimals', () => {
    const solToken = {
      symbol: 'SOL',
      assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
      direction: 'out',
    } as TokenAmount;

    expect(
      canRenderActivityDetailsDoItAgain(
        solToken,
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      ),
    ).toBe(true);
  });
});
