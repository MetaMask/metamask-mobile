import { renderHook } from '@testing-library/react-native';
import {
  canRenderActivityDetailsDoItAgain,
  useActivityDetailsDoItAgain,
} from './useActivityDetailsDoItAgain';
import Routes from '../../../../constants/navigation/Routes';
import type { TokenAmount } from '../../../../util/activity-adapters';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

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
  beforeEach(() => jest.clearAllMocks());

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
