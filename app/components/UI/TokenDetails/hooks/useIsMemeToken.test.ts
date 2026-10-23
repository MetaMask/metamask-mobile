import { renderHook } from '@testing-library/react-native';
import type { CaipAssetType } from '@metamask/utils';
import { selectMemecoinTdpV1TokenApiBaseUrl } from '../../../../selectors/featureFlagController/assetsMemecoinTdpV1';
import { useIsMemeToken } from './useIsMemeToken';

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

const mockUseTokenAssetDetails = jest.fn();
jest.mock('../queries/tokenAssetQuery', () => ({
  useTokenAssetDetails: (assetId: unknown, baseUrl: unknown) =>
    mockUseTokenAssetDetails(assetId, baseUrl),
}));

const ASSET_ID = 'eip155:1/erc20:0xAbC' as CaipAssetType;
const CONFIGURED_HOST = 'https://token.dev-api.cx.metamask.io';

const launchpadData = {
  protocol: 'pump.fun',
} as never;

describe('useIsMemeToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(CONFIGURED_HOST);
    mockUseTokenAssetDetails.mockReturnValue({
      asset: null,
      isLoading: false,
      isError: false,
    });
  });

  it('treats a token carrying launchpad data as a meme token', () => {
    mockUseTokenAssetDetails.mockReturnValue({
      asset: { launchpadData },
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useIsMemeToken({ assetId: ASSET_ID }));

    expect(result.current).toStrictEqual({ isMeme: true, isLoading: false });
  });

  it('treats a token without launchpad data as a standard token', () => {
    mockUseTokenAssetDetails.mockReturnValue({
      asset: { launchpadData: null },
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useIsMemeToken({ assetId: ASSET_ID }));

    expect(result.current).toStrictEqual({ isMeme: false, isLoading: false });
  });

  it('reports loading while the asset request is in flight', () => {
    mockUseTokenAssetDetails.mockReturnValue({
      asset: null,
      isLoading: true,
      isError: false,
    });

    const { result } = renderHook(() => useIsMemeToken({ assetId: ASSET_ID }));

    expect(result.current).toStrictEqual({ isMeme: false, isLoading: true });
  });

  // Detection has to ask the host the page itself reads, or it would judge a
  // token against a response that never carries `launchpadData`.
  it('asks the host the remote config names', () => {
    renderHook(() => useIsMemeToken({ assetId: ASSET_ID }));

    expect(mockUseSelector).toHaveBeenCalledWith(
      selectMemecoinTdpV1TokenApiBaseUrl,
    );
    expect(mockUseTokenAssetDetails).toHaveBeenCalledWith(
      ASSET_ID,
      CONFIGURED_HOST,
    );
  });

  it('disables the request when the feature is off', () => {
    renderHook(() => useIsMemeToken({ assetId: ASSET_ID, enabled: false }));

    expect(mockUseTokenAssetDetails).toHaveBeenCalledWith(
      null,
      CONFIGURED_HOST,
    );
  });
});
