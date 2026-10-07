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

const mockUseTokenAssetDetails = jest.fn();
jest.mock('../queries/useTokenAssetDetails', () => ({
  useTokenAssetDetails: (assetId: unknown) => mockUseTokenAssetDetails(assetId),
}));

const ASSET_ID = 'eip155:1/erc20:0xAbC' as CaipAssetType;

const token = {
  caipAssetId: ASSET_ID,
  address: '0xabc',
  chainId: '0x1',
} as TokenDetailsRouteParams;

const settledWithoutLaunchpad = {
  asset: { launchpadData: null },
  isLoading: false,
  isError: false,
};

describe('useTokenDetailsVariant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTokenAssetDetails.mockReturnValue(settledWithoutLaunchpad);
  });

  const arrange = ({
    isFlagEnabled,
    isMeme,
    asset = settledWithoutLaunchpad.asset,
    isLoading = false,
  }: {
    isFlagEnabled: boolean;
    isMeme: boolean;
    asset?: { launchpadData: object | null } | null;
    isLoading?: boolean;
  }) => {
    mockUseSelector.mockReturnValue(isFlagEnabled);
    mockUseIsMemeToken.mockReturnValue({ isMeme });
    mockUseTokenAssetDetails.mockReturnValue({
      asset,
      isLoading,
      isError: false,
    });

    return renderHook(() => useTokenDetailsVariant(token));
  };

  it('resolves the memecoin variant when the flag is on and the token is PEPE', () => {
    const { result } = arrange({ isFlagEnabled: true, isMeme: true });

    expect(result.current).toEqual({
      variant: TokenDetailsVariant.Memecoin,
      isPending: false,
    });
    expect(mockUseTokenAssetDetails).toHaveBeenCalledWith(null);
  });

  it('resolves the legacy page when the flag is off', () => {
    const { result } = arrange({ isFlagEnabled: false, isMeme: true });

    expect(result.current).toEqual({ variant: null, isPending: false });
    expect(mockUseTokenAssetDetails).toHaveBeenCalledWith(null);
  });

  it('waits for the token API when the flag is on and the token is not PEPE', () => {
    const { result } = arrange({
      isFlagEnabled: true,
      isMeme: false,
      isLoading: true,
      asset: null,
    });

    expect(result.current).toEqual({ variant: null, isPending: true });
    expect(mockUseTokenAssetDetails).toHaveBeenCalledWith(ASSET_ID);
  });

  it('resolves the memecoin variant when launchpad data is present', () => {
    const { result } = arrange({
      isFlagEnabled: true,
      isMeme: false,
      asset: { launchpadData: { description: 'A launch' } },
    });

    expect(result.current).toEqual({
      variant: TokenDetailsVariant.Memecoin,
      isPending: false,
    });
  });

  it('resolves the legacy page when launchpad data is missing', () => {
    const { result } = arrange({ isFlagEnabled: true, isMeme: false });

    expect(result.current).toEqual({ variant: null, isPending: false });
  });

  it('resolves the legacy page when the token API fails', () => {
    const { result } = arrange({
      isFlagEnabled: true,
      isMeme: false,
      asset: null,
    });

    expect(result.current).toEqual({ variant: null, isPending: false });
  });

  it('passes the resolved asset id and flag state to the meme check', () => {
    arrange({ isFlagEnabled: true, isMeme: true });

    expect(mockUseIsMemeToken).toHaveBeenCalledWith({
      assetId: ASSET_ID,
      enabled: true,
    });
  });
});
