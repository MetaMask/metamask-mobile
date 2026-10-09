import { renderHook } from '@testing-library/react-native';
import type { CaipAssetType } from '@metamask/utils';
import {
  TokenDetailsVariant,
  type TokenDetailsRouteParams,
} from '../constants/constants';
import { useTokenDetailsVariant } from './useTokenDetailsVariant';

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

const mockUseIsMemeToken = jest.fn();
jest.mock('./useIsMemeToken', () => ({
  useIsMemeToken: (opts: unknown) => mockUseIsMemeToken(opts),
}));

const ASSET_ID = 'eip155:1/erc20:0xAbC' as CaipAssetType;

const token = {
  caipAssetId: ASSET_ID,
  address: '0xabc',
  chainId: '0x1',
} as TokenDetailsRouteParams;

describe('useTokenDetailsVariant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const arrange = ({
    isFlagEnabled,
    isMeme,
  }: {
    isFlagEnabled: boolean;
    isMeme: boolean;
  }) => {
    mockUseSelector.mockReturnValue(isFlagEnabled);
    mockUseIsMemeToken.mockReturnValue({ isMeme });

    return renderHook(() => useTokenDetailsVariant(token));
  };

  it('resolves the memecoin variant when the flag is on and the token is a meme', () => {
    const { result } = arrange({ isFlagEnabled: true, isMeme: true });

    expect(result.current).toBe(TokenDetailsVariant.Memecoin);
  });

  it('resolves no variant when the flag is off', () => {
    const { result } = arrange({ isFlagEnabled: false, isMeme: true });

    expect(result.current).toBeNull();
  });

  it('resolves no variant when the token is not a meme', () => {
    const { result } = arrange({ isFlagEnabled: true, isMeme: false });

    expect(result.current).toBeNull();
  });

  it('passes the resolved asset id and flag state to the meme check', () => {
    arrange({ isFlagEnabled: true, isMeme: true });

    expect(mockUseIsMemeToken).toHaveBeenCalledWith({
      assetId: ASSET_ID,
      enabled: true,
    });
  });
});
