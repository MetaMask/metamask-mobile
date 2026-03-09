import { Asset } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useTokenBalance } from './useTokenBalance';
import { TokenI } from '../../Tokens/types';
import {
  selectAsset,
  selectTronSpecialAssetsBySelectedAccountGroup,
  TronSpecialAssetsMap,
} from '../../../../selectors/assets/assets-list';
import { createStakedTrxAsset } from '../../AssetOverview/utils/createStakedTrxAsset';

const TRON_MAINNET_CHAIN_ID = 'tron:728126428';

const createMockTronAsset = (symbol: string, balance: string): Asset =>
  ({
    accountType: 'tron:eoa',
    assetId: `${TRON_MAINNET_CHAIN_ID}/slip44:${symbol}`,
    chainId: TRON_MAINNET_CHAIN_ID,
    accountId: 'mock-account-id',
    image: '',
    name: symbol,
    symbol,
    decimals: 6,
    isNative: false,
    rawBalance: '0x0' as Hex,
    balance,
    fiat: { balance: 0, currency: 'usd', conversionRate: 1 },
  }) as Asset;

const createEmptySpecialAssetsMap = (): TronSpecialAssetsMap => ({
  energy: undefined,
  bandwidth: undefined,
  maxEnergy: undefined,
  maxBandwidth: undefined,
  stakedTrxForEnergy: undefined,
  stakedTrxForBandwidth: undefined,
  totalStakedTrx: 0,
  trxReadyForWithdrawal: undefined,
  trxStakingRewards: undefined,
  trxInLockPeriod: undefined,
});

jest.mock('../../../../selectors/assets/assets-list', () => ({
  selectAsset: jest.fn(),
  selectTronSpecialAssetsBySelectedAccountGroup: jest.fn(
    (): TronSpecialAssetsMap => ({
      energy: undefined,
      bandwidth: undefined,
      maxEnergy: undefined,
      maxBandwidth: undefined,
      stakedTrxForEnergy: undefined,
      stakedTrxForBandwidth: undefined,
      totalStakedTrx: 0,
      trxReadyForWithdrawal: undefined,
      trxStakingRewards: undefined,
      trxInLockPeriod: undefined,
    }),
  ),
}));

jest.mock('../../AssetOverview/utils/createStakedTrxAsset', () => ({
  createStakedTrxAsset: jest.fn(),
}));

const mockSelectAsset = jest.mocked(selectAsset);
const mockSelectTronResources = jest.mocked(
  selectTronSpecialAssetsBySelectedAccountGroup,
);
const mockCreateStakedTrxAsset = jest.mocked(createStakedTrxAsset);

describe('useTokenBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectTronResources.mockReturnValue(createEmptySpecialAssetsMap());
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

    expect(mockSelectAsset).toHaveBeenCalledWith(expect.any(Object), {
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      chainId: token.chainId,
      isStaked: false,
    });
    expect(result.current.balance).toBe('100');
    expect(result.current.fiatBalance).toBe('$100.00');
    expect(result.current.tokenFormattedBalance).toBe('100 DAI');
  });

  it('passes through isStaked when token is staked', () => {
    const token = {
      address: '0x0000000000000000000000000000000000000000',
      chainId: '0x1',
      isStaked: true,
    } as TokenI;

    mockSelectAsset.mockReturnValue({
      balance: '2',
      balanceFiat: '$4,800.00',
      symbol: 'ETH',
      isStaked: true,
    } as TokenI);

    renderHookWithProvider(() => useTokenBalance(token));

    expect(mockSelectAsset).toHaveBeenCalledWith(expect.any(Object), {
      address: token.address,
      chainId: token.chainId,
      isStaked: true,
    });
  });

  it('returns staked TRX asset for Tron native token', () => {
    const tronToken = {
      address: '',
      chainId: TRON_MAINNET_CHAIN_ID,
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
      ...createEmptySpecialAssetsMap(),
      stakedTrxForEnergy: createMockTronAsset('strx-energy', '100'),
      stakedTrxForBandwidth: createMockTronAsset('strx-bandwidth', '200'),
    });

    mockCreateStakedTrxAsset.mockReturnValue(mockStakedAsset);

    const { result } = renderHookWithProvider(() => useTokenBalance(tronToken));

    expect(mockSelectAsset).toHaveBeenCalledWith(expect.any(Object), {
      address: tronToken.address,
      chainId: tronToken.chainId,
      isStaked: false,
    });
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

  it('returns in-lock-period balance for Tron native token', () => {
    const tronToken = {
      address: '',
      chainId: TRON_MAINNET_CHAIN_ID,
      ticker: 'TRX',
      symbol: 'TRX',
    } as TokenI;

    mockSelectAsset.mockReturnValue({
      balance: '1000',
      balanceFiat: '$100.00',
      symbol: 'TRX',
    } as TokenI);

    mockSelectTronResources.mockReturnValue({
      ...createEmptySpecialAssetsMap(),
      trxInLockPeriod: createMockTronAsset('trx-in-lock-period', '20'),
    });

    const { result } = renderHookWithProvider(() => useTokenBalance(tronToken));

    expect(result.current.inLockPeriodBalance).toBe('20');
  });

  it('returns undefined for in-lock-period when balance is zero', () => {
    const tronToken = {
      address: '',
      chainId: TRON_MAINNET_CHAIN_ID,
      ticker: 'TRX',
      symbol: 'TRX',
    } as TokenI;

    mockSelectAsset.mockReturnValue({
      balance: '1000',
      balanceFiat: '$100.00',
      symbol: 'TRX',
    } as TokenI);

    mockSelectTronResources.mockReturnValue({
      ...createEmptySpecialAssetsMap(),
      trxInLockPeriod: createMockTronAsset('trx-in-lock-period', '0'),
    });

    const { result } = renderHookWithProvider(() => useTokenBalance(tronToken));

    expect(result.current.inLockPeriodBalance).toBeUndefined();
  });

  it('returns undefined for in-lock-period when balance is non-numeric', () => {
    const tronToken = {
      address: '',
      chainId: TRON_MAINNET_CHAIN_ID,
      ticker: 'TRX',
      symbol: 'TRX',
    } as TokenI;

    mockSelectAsset.mockReturnValue({
      balance: '1000',
      balanceFiat: '$100.00',
      symbol: 'TRX',
    } as TokenI);

    mockSelectTronResources.mockReturnValue({
      ...createEmptySpecialAssetsMap(),
      trxInLockPeriod: createMockTronAsset(
        'trx-in-lock-period',
        'not-a-number',
      ),
    });

    const { result } = renderHookWithProvider(() => useTokenBalance(tronToken));

    expect(result.current.inLockPeriodBalance).toBeUndefined();
  });

  it('returns undefined for in-lock-period when balance is empty string', () => {
    const tronToken = {
      address: '',
      chainId: TRON_MAINNET_CHAIN_ID,
      ticker: 'TRX',
      symbol: 'TRX',
    } as TokenI;

    mockSelectAsset.mockReturnValue({
      balance: '1000',
      balanceFiat: '$100.00',
      symbol: 'TRX',
    } as TokenI);

    mockSelectTronResources.mockReturnValue({
      ...createEmptySpecialAssetsMap(),
      trxInLockPeriod: createMockTronAsset('trx-in-lock-period', ''),
    });

    const { result } = renderHookWithProvider(() => useTokenBalance(tronToken));

    expect(result.current.inLockPeriodBalance).toBeUndefined();
  });

  it('returns undefined for in-lock-period when resources are not available', () => {
    const tronToken = {
      address: '',
      chainId: TRON_MAINNET_CHAIN_ID,
      ticker: 'TRX',
      symbol: 'TRX',
    } as TokenI;

    mockSelectAsset.mockReturnValue({
      balance: '1000',
      balanceFiat: '$100.00',
      symbol: 'TRX',
    } as TokenI);

    mockSelectTronResources.mockReturnValue(createEmptySpecialAssetsMap());

    const { result } = renderHookWithProvider(() => useTokenBalance(tronToken));

    expect(result.current.inLockPeriodBalance).toBeUndefined();
  });
});
