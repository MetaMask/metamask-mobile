import { act, renderHook } from '@testing-library/react-native';
import type { Asset } from '@metamask/assets-controllers';
import { useStore } from 'react-redux';
import type { RootState } from '../../../../reducers';
import Routes from '../../../../constants/navigation/Routes';
import { selectIsBridgeEnabledSourceFactory } from '../../../../core/redux/slices/bridge';
import { selectAssetsBySelectedAccountGroup } from '../../../../selectors/assets/assets-list';
import { areAddressesEqual } from '../../../../util/address';
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../../Bridge/hooks/useSwapBridgeNavigation';
import type { BridgeToken } from '../../Bridge/types';
import { computeBuySourceToken } from '../../Bridge/utils/computeBuySourceToken';
import { RAMPS_BUY_CUF_SURFACE } from '../../Ramp/constants/rampsBuyCufTags';
import { useRampNavigation } from '../../Ramp/hooks/useRampNavigation';
import type {
  EarnAsset,
  EarnAssetId,
  EarnExperience,
} from '../types/earnAssets';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { EARN_MODULE_REDIRECT_TARGETS } from '../constants/earnModuleEvents';
import { earnAssetToBridgeToken } from '../utils/earnAssets';
import useEarnAssetAcquisitionNavigation from './useEarnAssetAcquisitionNavigation';

const mockGetState = jest.fn<RootState, []>();
const mockUseStore = jest.mocked(useStore);
const mockIsBridgeEnabledSource = jest.fn();
const mockComputeBuySourceToken = jest.mocked(computeBuySourceToken);
const mockEarnAssetToBridgeToken = jest.mocked(earnAssetToBridgeToken);
const mockGoToSwaps = jest.fn();
const mockGoToBuy = jest.fn();

jest.mock('react-redux', () => ({
  useStore: jest.fn(() => ({ getState: mockGetState })),
}));

jest.mock('../../../../core/redux/slices/bridge', () => ({
  selectIsBridgeEnabledSourceFactory: jest.fn(),
}));

jest.mock('../../../../selectors/assets/assets-list', () => ({
  selectAssetsBySelectedAccountGroup: jest.fn(),
}));

jest.mock('../../../../util/address', () => ({
  areAddressesEqual: jest.fn(
    (firstAddress: string, secondAddress: string) =>
      firstAddress.toLowerCase() === secondAddress.toLowerCase(),
  ),
}));

jest.mock('../../Bridge/hooks/useSwapBridgeNavigation', () => ({
  SwapBridgeNavigationLocation: {
    TokenView: 'TokenView',
  },
  useSwapBridgeNavigation: jest.fn(() => ({
    goToSwaps: mockGoToSwaps,
  })),
}));

jest.mock('../../Bridge/utils/computeBuySourceToken', () => ({
  computeBuySourceToken: jest.fn(),
}));

jest.mock('../../Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: jest.fn(() => ({
    goToBuy: mockGoToBuy,
  })),
}));

jest.mock('../utils/earnAssets', () => ({
  earnAssetToBridgeToken: jest.fn(),
  requiresEarnAssetAcquisition: (
    readiness: EarnExperience['depositReadiness'],
  ) =>
    readiness.status === 'not_ready' &&
    [
      'asset_not_tracked',
      'insufficient_balance',
      'balance_unavailable',
    ].includes(readiness.reason),
}));

const mockSelectIsBridgeEnabledSourceFactory = jest.mocked(
  selectIsBridgeEnabledSourceFactory,
);
const mockSelectAssetsBySelectedAccountGroup = jest.mocked(
  selectAssetsBySelectedAccountGroup,
);
const mockAreAddressesEqual = jest.mocked(areAddressesEqual);
const mockUseSwapBridgeNavigation = jest.mocked(useSwapBridgeNavigation);
const mockUseRampNavigation = jest.mocked(useRampNavigation);

const destinationAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const destinationAssetId =
  `eip155:1/erc20:${destinationAddress}` as EarnAssetId;

const destinationToken: BridgeToken = {
  address: destinationAddress,
  chainId: '0x1',
  decimals: 6,
  symbol: 'USDC',
  name: 'USD Coin',
  image: 'usdc.png',
};

const sourceToken: BridgeToken = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: '0x89',
  decimals: 18,
  symbol: 'POL',
  name: 'POL',
  image: 'pol.png',
};

const createExperience = (
  depositReadiness: EarnExperience['depositReadiness'],
): EarnExperience => ({
  id: 'strategy:stablecoin-lending',
  type: EARN_EXPERIENCES.STABLECOIN_LENDING,
  role: 'underlying',
  depositReadiness,
  rate: { type: 'APY', status: 'ready', percentage: 5 },
  isFeeSubsidized: false,
});

const createEarnAsset = (experience: EarnExperience): EarnAsset => ({
  assetId: destinationAssetId,
  metadata: {
    address: destinationAddress,
    chainId: '0x1',
    decimals: 6,
    image: 'usdc.png',
    name: 'USD Coin',
    symbol: 'USDC',
    logo: 'usdc.png',
    isETH: false,
  },
  wallet: { status: 'untracked' },
  experiences: [experience],
});

const createSourceAsset = (): Asset =>
  ({
    assetId: sourceToken.address,
    chainId: sourceToken.chainId,
    decimals: sourceToken.decimals,
    symbol: sourceToken.symbol,
    name: sourceToken.name,
    image: sourceToken.image,
    fiat: { balance: 10 },
    isNative: true,
  }) as Asset;

describe('useEarnAssetAcquisitionNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({} as RootState);
    mockUseStore.mockReturnValue({
      getState: mockGetState,
    } as unknown as ReturnType<typeof useStore>);
    mockSelectIsBridgeEnabledSourceFactory.mockReturnValue(
      mockIsBridgeEnabledSource,
    );
    mockSelectAssetsBySelectedAccountGroup.mockReturnValue({
      [sourceToken.chainId]: [createSourceAsset()],
    });
    mockIsBridgeEnabledSource.mockReturnValue(true);
    mockEarnAssetToBridgeToken.mockReturnValue(destinationToken);
    mockComputeBuySourceToken.mockReturnValue(sourceToken);
    mockUseSwapBridgeNavigation.mockReturnValue({
      goToSwaps: mockGoToSwaps,
      networkModal: null,
    });
    mockUseRampNavigation.mockReturnValue({
      goToBuy: mockGoToBuy,
      goToAggregator: jest.fn(),
      goToSell: jest.fn(),
    });
  });

  it('returns undefined for a ready deposit', () => {
    const earnAsset = createEarnAsset(createExperience({ status: 'ready' }));
    const { result } = renderHook(() => useEarnAssetAcquisitionNavigation());

    const route = result.current.resolveEarnAssetAcquisitionRoute(
      earnAsset,
      earnAsset.experiences[0],
    );

    expect(route).toBeUndefined();
    expect(mockComputeBuySourceToken).not.toHaveBeenCalled();
  });

  it('resolves a swap route when a bridge-enabled source token exists', () => {
    const earnAsset = createEarnAsset(
      createExperience({ status: 'not_ready', reason: 'insufficient_balance' }),
    );
    const { result } = renderHook(() => useEarnAssetAcquisitionNavigation());

    const route = result.current.resolveEarnAssetAcquisitionRoute(
      earnAsset,
      earnAsset.experiences[0],
    );

    expect(route).toEqual({
      type: 'swap',
      sourceToken,
      destinationToken,
      redirectTarget: EARN_MODULE_REDIRECT_TARGETS.SWAP,
    });
    expect(mockComputeBuySourceToken).toHaveBeenCalledWith(
      expect.anything(),
      destinationToken.chainId,
      destinationToken.address,
      expect.any(Function),
    );
  });

  it('filters same-address and bridge-disabled sources from swap eligibility', () => {
    const earnAsset = createEarnAsset(
      createExperience({ status: 'not_ready', reason: 'asset_not_tracked' }),
    );
    mockIsBridgeEnabledSource.mockImplementation(
      (chainId) =>
        chainId === sourceToken.chainId || chainId === destinationToken.chainId,
    );
    mockComputeBuySourceToken.mockImplementationOnce(
      (_assets, _chainId, _address, isEligible) => {
        expect(isEligible?.(createSourceAsset())).toBe(true);
        expect(
          isEligible?.({
            ...createSourceAsset(),
            assetId: destinationAddress,
            chainId: destinationToken.chainId,
          }),
        ).toBe(false);
        expect(
          isEligible?.({
            ...createSourceAsset(),
            chainId: '0x999',
          }),
        ).toBe(false);
        return null;
      },
    );
    const { result } = renderHook(() => useEarnAssetAcquisitionNavigation());

    const route = result.current.resolveEarnAssetAcquisitionRoute(
      earnAsset,
      earnAsset.experiences[0],
    );

    expect(route).toEqual({
      type: 'buy',
      assetId: destinationAssetId,
      redirectTarget: EARN_MODULE_REDIRECT_TARGETS.BUY,
    });
    expect(mockAreAddressesEqual).toHaveBeenCalled();
  });

  it('resolves a buy route when no source token exists', () => {
    mockComputeBuySourceToken.mockReturnValue(null);
    const earnAsset = createEarnAsset(
      createExperience({ status: 'not_ready', reason: 'balance_unavailable' }),
    );
    const { result } = renderHook(() => useEarnAssetAcquisitionNavigation());

    const route = result.current.resolveEarnAssetAcquisitionRoute(
      earnAsset,
      earnAsset.experiences[0],
    );

    expect(route).toEqual({
      type: 'buy',
      assetId: destinationAssetId,
      redirectTarget: EARN_MODULE_REDIRECT_TARGETS.BUY,
    });
  });

  it('resolves a buy route when destination bridge support is disabled', () => {
    mockIsBridgeEnabledSource.mockReturnValue(false);
    const earnAsset = createEarnAsset(
      createExperience({ status: 'not_ready', reason: 'asset_not_tracked' }),
    );
    const { result } = renderHook(() => useEarnAssetAcquisitionNavigation());

    const route = result.current.resolveEarnAssetAcquisitionRoute(
      earnAsset,
      earnAsset.experiences[0],
    );

    expect(route).toEqual({
      type: 'buy',
      assetId: destinationAssetId,
      redirectTarget: EARN_MODULE_REDIRECT_TARGETS.BUY,
    });
    expect(mockComputeBuySourceToken).not.toHaveBeenCalled();
  });

  it('navigates swap routes with the destination token preserved', async () => {
    const { result } = renderHook(() => useEarnAssetAcquisitionNavigation());

    await act(async () => {
      await result.current.navigateToEarnAssetAcquisitionRoute({
        type: 'swap',
        sourceToken,
        destinationToken,
        redirectTarget: EARN_MODULE_REDIRECT_TARGETS.SWAP,
      });
    });

    expect(mockGoToSwaps).toHaveBeenCalledWith(
      sourceToken,
      destinationToken,
      undefined,
      true,
    );
  });

  it('navigates buy routes through the Earn surface', async () => {
    const { result } = renderHook(() => useEarnAssetAcquisitionNavigation());

    await act(async () => {
      await result.current.navigateToEarnAssetAcquisitionRoute({
        type: 'buy',
        assetId: destinationAssetId,
        redirectTarget: EARN_MODULE_REDIRECT_TARGETS.BUY,
      });
    });

    expect(mockGoToBuy).toHaveBeenCalledWith(
      { assetId: destinationAssetId },
      { surface: RAMPS_BUY_CUF_SURFACE.EARN },
    );
  });

  it('configures swap navigation for strategy selection', () => {
    renderHook(() => useEarnAssetAcquisitionNavigation());

    expect(mockUseSwapBridgeNavigation).toHaveBeenCalledWith({
      location: SwapBridgeNavigationLocation.TokenView,
      sourcePage: Routes.EARN.MODALS.STRATEGY_SELECTION,
      skipActionButtonClickTracking: true,
    });
  });
});
