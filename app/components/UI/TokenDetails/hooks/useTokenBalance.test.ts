import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useTokenBalance } from './useTokenBalance';
import { TokenI } from '../../Tokens/types';
import {
  selectAsset,
  selectTronSpecialAssetsBySelectedAccountGroup,
  TronSpecialAssetsMap,
} from '../../../../selectors/assets/assets-list';
import { createStakedTrxAsset } from '../../AssetOverview/utils/createStakedTrxAsset';
import {
  createReadyForWithdrawalTrxAsset,
  createStakingRewardsTrxAsset,
  createInLockPeriodTrxAsset,
} from '../../AssetOverview/utils/createTronDerivedAsset';

const createEmptyResourcesMap = (): TronSpecialAssetsMap => ({
  energy: undefined,
  bandwidth: undefined,
  maxEnergy: undefined,
  maxBandwidth: undefined,
  stakedTrxForEnergy: undefined,
  stakedTrxForBandwidth: undefined,
  totalStakedTrx: 0,
  readyForWithdrawal: undefined,
  stakingRewards: undefined,
  inLockPeriod: undefined,
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
      readyForWithdrawal: undefined,
      stakingRewards: undefined,
      inLockPeriod: undefined,
    }),
  ),
}));

jest.mock('../../AssetOverview/utils/createStakedTrxAsset', () => ({
  createStakedTrxAsset: jest.fn(),
}));

jest.mock('../../AssetOverview/utils/createTronDerivedAsset', () => ({
  createReadyForWithdrawalTrxAsset: jest.fn(),
  createStakingRewardsTrxAsset: jest.fn(),
  createInLockPeriodTrxAsset: jest.fn(),
}));

const mockSelectAsset = jest.mocked(selectAsset);
const mockSelectTronResources = jest.mocked(
  selectTronSpecialAssetsBySelectedAccountGroup,
);
const mockCreateStakedTrxAsset = jest.mocked(createStakedTrxAsset);
const mockCreateReadyForWithdrawalTrxAsset = jest.mocked(
  createReadyForWithdrawalTrxAsset,
);
const mockCreateStakingRewardsTrxAsset = jest.mocked(
  createStakingRewardsTrxAsset,
);
const mockCreateInLockPeriodTrxAsset = jest.mocked(createInLockPeriodTrxAsset);

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

    // Address is normalized to checksum format for consistent lookup
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
    } as TronSpecialAssetsMap);

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

  it('returns ready-for-withdrawal, staking-rewards, and in-lock-period assets for Tron native token', () => {
    const tronToken = {
      address: '',
      chainId: 'tron:0x2b6653dc',
      ticker: 'TRX',
      symbol: 'TRX',
    } as TokenI;

    const mockRfwAsset = { symbol: 'rfwTRX', balance: '10' } as TokenI;
    const mockSrAsset = { symbol: 'srTRX', balance: '5' } as TokenI;
    const mockIlpAsset = { symbol: 'ilpTRX', balance: '20' } as TokenI;

    mockSelectAsset.mockReturnValue({
      balance: '1000',
      balanceFiat: '$100.00',
      symbol: 'TRX',
    } as TokenI);

    mockSelectTronResources.mockReturnValue({
      ...createEmptyResourcesMap(),
      readyForWithdrawal: { symbol: 'rfwtrx', balance: '10' },
      stakingRewards: { symbol: 'srtrx', balance: '5' },
      inLockPeriod: { symbol: 'ilptrx', balance: '20' },
    } as unknown as TronSpecialAssetsMap);

    mockCreateReadyForWithdrawalTrxAsset.mockReturnValue(mockRfwAsset);
    mockCreateStakingRewardsTrxAsset.mockReturnValue(mockSrAsset);
    mockCreateInLockPeriodTrxAsset.mockReturnValue(mockIlpAsset);

    const { result } = renderHookWithProvider(() => useTokenBalance(tronToken));

    expect(result.current.readyForWithdrawalTrxAsset).toBe(mockRfwAsset);
    expect(result.current.stakingRewardsTrxAsset).toBe(mockSrAsset);
    expect(result.current.inLockPeriodTrxAsset).toBe(mockIlpAsset);
    expect(mockCreateReadyForWithdrawalTrxAsset).toHaveBeenCalledWith(
      tronToken,
      '10',
    );
    expect(mockCreateStakingRewardsTrxAsset).toHaveBeenCalledWith(
      tronToken,
      '5',
    );
    expect(mockCreateInLockPeriodTrxAsset).toHaveBeenCalledWith(
      tronToken,
      '20',
    );
  });

  it('returns undefined for new Tron assets when resources are not available', () => {
    const tronToken = {
      address: '',
      chainId: 'tron:0x2b6653dc',
      ticker: 'TRX',
      symbol: 'TRX',
    } as TokenI;

    mockSelectAsset.mockReturnValue({
      balance: '1000',
      balanceFiat: '$100.00',
      symbol: 'TRX',
    } as TokenI);

    mockSelectTronResources.mockReturnValue(createEmptyResourcesMap());

    const { result } = renderHookWithProvider(() => useTokenBalance(tronToken));

    expect(result.current.readyForWithdrawalTrxAsset).toBeUndefined();
    expect(result.current.stakingRewardsTrxAsset).toBeUndefined();
    expect(result.current.inLockPeriodTrxAsset).toBeUndefined();
    expect(mockCreateReadyForWithdrawalTrxAsset).not.toHaveBeenCalled();
    expect(mockCreateStakingRewardsTrxAsset).not.toHaveBeenCalled();
    expect(mockCreateInLockPeriodTrxAsset).not.toHaveBeenCalled();
  });
});
