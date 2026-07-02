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
});
