import { renderHook } from '@testing-library/react-native';
import {
  createMainnetEthBuyabilityToken,
  createMainnetMusdBuyabilityToken,
  MAINNET_ETH_RAMP_ASSET_ID,
  MAINNET_MUSD_RAMP_ASSET_ID,
} from './fundRampPriorityAssets';
import { useWalletHomeOnboardingFundRampIntent } from './useWalletHomeOnboardingFundRampIntent';
import {
  getTokenBuyabilityKey,
  useTokensBuyability,
} from '../Ramp/hooks/useTokenBuyability';

jest.mock('../Ramp/hooks/useTokenBuyability', () => {
  const actual = jest.requireActual('../Ramp/hooks/useTokenBuyability');
  return {
    ...actual,
    useTokensBuyability: jest.fn(),
  };
});

const mockUseTokensBuyability = useTokensBuyability as jest.MockedFunction<
  typeof useTokensBuyability
>;

describe('useWalletHomeOnboardingFundRampIntent', () => {
  const musdKey = getTokenBuyabilityKey(createMainnetMusdBuyabilityToken());
  const ethKey = getTokenBuyabilityKey(createMainnetEthBuyabilityToken());

  const setBuyability = (
    buyabilityByTokenKey: Record<string, boolean> = {},
    isLoading = false,
  ) => {
    mockUseTokensBuyability.mockReturnValue({
      buyabilityByTokenKey,
      isLoading,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setBuyability({
      [musdKey]: true,
      [ethKey]: true,
    });
  });

  it('returns undefined rampIntent while buyability is loading', () => {
    setBuyability({}, true);

    const { result } = renderHook(() =>
      useWalletHomeOnboardingFundRampIntent(),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.rampIntent).toBeUndefined();
  });

  it('returns mUSD asset id when mainnet mUSD is buyable', () => {
    setBuyability({ [musdKey]: true, [ethKey]: false });

    const { result } = renderHook(() =>
      useWalletHomeOnboardingFundRampIntent(),
    );

    expect(result.current.rampIntent).toEqual({
      assetId: MAINNET_MUSD_RAMP_ASSET_ID,
    });
  });

  it('returns ETH asset id when mUSD is not buyable but ETH is', () => {
    setBuyability({ [musdKey]: false, [ethKey]: true });

    const { result } = renderHook(() =>
      useWalletHomeOnboardingFundRampIntent(),
    );

    expect(result.current.rampIntent).toEqual({
      assetId: MAINNET_ETH_RAMP_ASSET_ID,
    });
  });

  it('prefers mUSD when both mUSD and ETH are buyable', () => {
    setBuyability({ [musdKey]: true, [ethKey]: true });

    const { result } = renderHook(() =>
      useWalletHomeOnboardingFundRampIntent(),
    );

    expect(result.current.rampIntent).toEqual({
      assetId: MAINNET_MUSD_RAMP_ASSET_ID,
    });
  });

  it('returns undefined rampIntent when neither asset is buyable', () => {
    setBuyability({ [musdKey]: false, [ethKey]: false });

    const { result } = renderHook(() =>
      useWalletHomeOnboardingFundRampIntent(),
    );

    expect(result.current.rampIntent).toBeUndefined();
  });
});
