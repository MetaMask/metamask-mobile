import { renderHook } from '@testing-library/react-native';
import {
  useFiatDepositRoute,
  ETH_MAINNET_FALLBACK_ASSET_ID,
} from './useFiatDepositRoute';
import { useRampsProviders } from './useRampsProviders';
import { useFiatProviderScope } from '../utils/providerScope';
import { selectMoneyDepositEthFallbackEnabled } from '../../../../selectors/featureFlagController/moneyAccount';

jest.mock('./useRampsProviders', () => ({
  useRampsProviders: jest.fn(),
}));
jest.mock('../utils/providerScope', () => ({
  useFiatProviderScope: jest.fn(),
}));
jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector(undefined),
}));
jest.mock('../../../../selectors/featureFlagController/moneyAccount', () => ({
  selectMoneyDepositEthFallbackEnabled: jest.fn(),
}));

const mockUseRampsProviders = useRampsProviders as jest.Mock;
const mockUseFiatProviderScope = useFiatProviderScope as jest.Mock;
const mockSelectEthFallbackEnabled =
  selectMoneyDepositEthFallbackEnabled as unknown as jest.Mock;

const MUSD_ASSET_ID =
  'eip155:143/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA';

const musdProvider = {
  type: 'aggregator',
  supportedCryptoCurrencies: { [MUSD_ASSET_ID.toLowerCase()]: true },
};
const ethAggregatorProvider = {
  type: 'aggregator',
  supportedCryptoCurrencies: { [ETH_MAINNET_FALLBACK_ASSET_ID]: true },
};

describe('useFiatDepositRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFiatProviderScope.mockReturnValue('all');
    mockSelectEthFallbackEnabled.mockReturnValue(false);
  });

  it('buys mUSD directly when a provider serves it (flag off)', () => {
    mockUseRampsProviders.mockReturnValue({ providers: [musdProvider] });

    const { result } = renderHook(() => useFiatDepositRoute(MUSD_ASSET_ID));

    expect(result.current).toStrictEqual({
      assetId: MUSD_ASSET_ID,
      isFallback: false,
    });
  });

  it('does not fall back to ETH when the flag is off', () => {
    mockUseRampsProviders.mockReturnValue({ providers: [ethAggregatorProvider] });

    const { result } = renderHook(() => useFiatDepositRoute(MUSD_ASSET_ID));

    expect(result.current).toBeUndefined();
  });

  it('prefers mUSD over the ETH fallback when both are available (flag on)', () => {
    mockSelectEthFallbackEnabled.mockReturnValue(true);
    mockUseRampsProviders.mockReturnValue({
      providers: [musdProvider, ethAggregatorProvider],
    });

    const { result } = renderHook(() => useFiatDepositRoute(MUSD_ASSET_ID));

    expect(result.current).toStrictEqual({
      assetId: MUSD_ASSET_ID,
      isFallback: false,
    });
  });

  it('falls back to ETH when only an ETH provider serves the region (flag on, scope all)', () => {
    mockSelectEthFallbackEnabled.mockReturnValue(true);
    mockUseRampsProviders.mockReturnValue({ providers: [ethAggregatorProvider] });

    const { result } = renderHook(() => useFiatDepositRoute(MUSD_ASSET_ID));

    expect(result.current).toStrictEqual({
      assetId: ETH_MAINNET_FALLBACK_ASSET_ID,
      isFallback: true,
    });
  });

  it('does not reach the aggregator ETH fallback under scope off (native-only)', () => {
    mockSelectEthFallbackEnabled.mockReturnValue(true);
    mockUseFiatProviderScope.mockReturnValue('off');
    mockUseRampsProviders.mockReturnValue({ providers: [ethAggregatorProvider] });

    const { result } = renderHook(() => useFiatDepositRoute(MUSD_ASSET_ID));

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when neither mUSD nor ETH has a provider (flag on)', () => {
    mockSelectEthFallbackEnabled.mockReturnValue(true);
    mockUseRampsProviders.mockReturnValue({
      providers: [
        {
          type: 'aggregator',
          supportedCryptoCurrencies: {
            'eip155:1/erc20:0xother': true,
          },
        },
      ],
    });

    const { result } = renderHook(() => useFiatDepositRoute(MUSD_ASSET_ID));

    expect(result.current).toBeUndefined();
  });
});
