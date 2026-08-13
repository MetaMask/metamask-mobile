import type { CaipChainId } from '@metamask/utils';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { NetworkToCaipChainId } from '../../../NetworkMultiSelector/NetworkMultiSelector.constants';
import { useTrendingChainIds } from './useTrendingChainIds';

jest.mock('../../utils/trendingNetworksList', () => {
  const { NetworkToCaipChainId: ChainIds } = jest.requireActual(
    '../../../NetworkMultiSelector/NetworkMultiSelector.constants',
  );

  return {
    TRENDING_NETWORKS_LIST: [
      {
        id: ChainIds.ETHEREUM,
        name: 'Ethereum',
        caipChainId: ChainIds.ETHEREUM,
        isSelected: false,
        imageSource: { uri: 'eth' },
      },
      {
        id: ChainIds.BASE,
        name: 'Base',
        caipChainId: ChainIds.BASE,
        isSelected: false,
        imageSource: { uri: 'base' },
      },
      {
        id: ChainIds.STELLAR,
        name: 'Stellar',
        caipChainId: ChainIds.STELLAR,
        isSelected: false,
        imageSource: { uri: 'xlm' },
      },
    ],
  };
});

jest.mock(
  '../../../../../selectors/featureFlagController/stellarAccountsEnabled',
  () => ({
    selectIsStellarAccountsEnabled: jest.fn(),
  }),
);

import { selectIsStellarAccountsEnabled } from '../../../../../selectors/featureFlagController/stellarAccountsEnabled';

const mockSelectIsStellarAccountsEnabled =
  selectIsStellarAccountsEnabled as unknown as jest.Mock;

describe('useTrendingChainIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectIsStellarAccountsEnabled.mockReturnValue(false);
  });

  it('returns provided chain IDs when they are not empty', () => {
    const providedChainIds = [NetworkToCaipChainId.POLYGON] as CaipChainId[];

    const { result } = renderHookWithProvider(() =>
      useTrendingChainIds(providedChainIds),
    );

    expect(result.current).toEqual(providedChainIds);
  });

  it('excludes Stellar when Stellar accounts feature is disabled', () => {
    mockSelectIsStellarAccountsEnabled.mockReturnValue(false);

    const { result } = renderHookWithProvider(() => useTrendingChainIds());

    expect(result.current).toEqual([
      NetworkToCaipChainId.ETHEREUM,
      NetworkToCaipChainId.BASE,
    ]);
  });

  it('includes Stellar when Stellar accounts feature is enabled', () => {
    mockSelectIsStellarAccountsEnabled.mockReturnValue(true);

    const { result } = renderHookWithProvider(() => useTrendingChainIds());

    expect(result.current).toEqual([
      NetworkToCaipChainId.ETHEREUM,
      NetworkToCaipChainId.BASE,
      NetworkToCaipChainId.STELLAR,
    ]);
  });

  it('returns trending network chain IDs when provided chain IDs are empty', () => {
    const { result } = renderHookWithProvider(() => useTrendingChainIds([]));

    expect(result.current).toEqual([
      NetworkToCaipChainId.ETHEREUM,
      NetworkToCaipChainId.BASE,
    ]);
  });
});
