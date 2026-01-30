import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useTokenBalance } from './useTokenBalance';
import { TokenI } from '../../Tokens/types';
import {
  selectAsset,
  selectTronResourcesBySelectedAccountGroup,
  TronResourcesMap,
} from '../../../../selectors/assets/assets-list';
import { createStakedTrxAsset } from '../../AssetOverview/utils/createStakedTrxAsset';

const createEmptyResourcesMap = (): TronResourcesMap => ({
  energy: undefined,
  bandwidth: undefined,
  maxEnergy: undefined,
  maxBandwidth: undefined,
  stakedTrxForEnergy: undefined,
  stakedTrxForBandwidth: undefined,
  totalStakedTrx: 0,
});

jest.mock('../../../../selectors/assets/assets-list', () => ({
  selectAsset: jest.fn(),
  selectTronResourcesBySelectedAccountGroup: jest.fn(() => ({
    energy: undefined,
    bandwidth: undefined,
    maxEnergy: undefined,
    maxBandwidth: undefined,
    stakedTrxForEnergy: undefined,
    stakedTrxForBandwidth: undefined,
  })),
}));

jest.mock('../../AssetOverview/utils/createStakedTrxAsset', () => ({
  createStakedTrxAsset: jest.fn(),
}));

const mockSelectAsset = jest.mocked(selectAsset);
const mockSelectTronResources = jest.mocked(
  selectTronResourcesBySelectedAccountGroup,
);
const mockCreateStakedTrxAsset = jest.mocked(createStakedTrxAsset);

describe('useTokenBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectTronResources.mockReturnValue(createEmptyResourcesMap());
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns balances from processed asset', () => {
    const token = {
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      chainId: '0x1',
      isStaked: false,
    } as TokenI;

    mockSelectAsset.mockReturnValue({
      balance: '100',
      balanceFiat: '$100.00',
      symbol: 'DAI',
    } as TokenI);

    const { result } = renderHookWithProvider(() => useTokenBalance(token));

    expect(result.current.balance).toBe('100');
    expect(result.current.fiatBalance).toBe('$100.00');
    expect(result.current.tokenFormattedBalance).toBe('100 DAI');
  });

  it('returns staked TRX asset for Tron native token', () => {
    const tronToken = {
      address: '',
      chainId: 'tron:0x2b6653dc',
      ticker: 'TRX',
      symbol: 'TRX',
    } as TokenI;

    const mockStakedAsset = { symbol: 'sTRX', balance: '50' } as TokenI;

    mockSelectAsset.mockReturnValue({
      balance: '1000',
      balanceFiat: '$100.00',
      symbol: 'TRX',
    } as TokenI);

    mockSelectTronResources.mockReturnValue({
      ...createEmptyResourcesMap(),
      stakedTrxForEnergy: { symbol: 'strx-energy', balance: '100' },
      stakedTrxForBandwidth: { symbol: 'strx-bandwidth', balance: '200' },
    } as TronResourcesMap);

    mockCreateStakedTrxAsset.mockReturnValue(mockStakedAsset);

    const { result } = renderHookWithProvider(() => useTokenBalance(tronToken));

    expect(result.current.balance).toBe('1000');
    expect(result.current.fiatBalance).toBe('$100.00');
    expect(result.current.tokenFormattedBalance).toBe('1000 TRX');
    expect(result.current.isTronNative).toBe(true);
    expect(result.current.stakedTrxAsset).toBe(mockStakedAsset);
    expect(mockCreateStakedTrxAsset).toHaveBeenCalledWith(
      tronToken,
      '100',
      '200',
    );
  });
});
