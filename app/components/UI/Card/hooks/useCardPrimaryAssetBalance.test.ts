import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useCardPrimaryAssetBalance } from './useCardPrimaryAssetBalance';
import { useAssetBalances } from './useAssetBalances';
import { toCardTokenAllowance } from '../util/toCardTokenAllowance';
import {
  FundingAssetStatus,
  type CardFundingAsset,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import { AllowanceState, type CardTokenAllowance } from '../types';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('./useAssetBalances', () => ({ useAssetBalances: jest.fn() }));
jest.mock('../util/toCardTokenAllowance');

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseAssetBalances = useAssetBalances as jest.MockedFunction<
  typeof useAssetBalances
>;
const mockToCardTokenAllowance = toCardTokenAllowance as jest.MockedFunction<
  typeof toCardTokenAllowance
>;

const mockAsset: CardFundingAsset = {
  symbol: 'USDC',
  name: 'USD Coin',
  address: '0xUSDCAddress',
  walletAddress: '0xWalletAddr',
  decimals: 6,
  chainId: 'eip155:59144',
  balance: '500',
  allowance: '1000',
  priority: 1,
  status: FundingAssetStatus.Active,
};

const mockLegacyToken: CardTokenAllowance = {
  address: '0xUSDCAddress',
  decimals: 6,
  symbol: 'USDC',
  name: 'USD Coin',
  caipChainId: 'eip155:59144',
  allowanceState: AllowanceState.Enabled,
  allowance: '500',
  totalAllowance: '1000',
  availableBalance: '500',
  walletAddress: '0xWalletAddr',
  priority: 1,
  stagingTokenAddress: null,
};

const mockBalanceEntry = {
  asset: undefined,
  balanceFiat: '$500.00',
  balanceFormatted: '500 USDC',
  rawFiatNumber: 500,
  rawTokenBalance: 500,
};

describe('useCardPrimaryAssetBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToCardTokenAllowance.mockReturnValue(mockLegacyToken);
    mockUseAssetBalances.mockReturnValue(new Map());
  });

  it('returns null when cardHomeData is null', () => {
    mockUseSelector.mockReturnValue(null);

    const { result } = renderHook(() => useCardPrimaryAssetBalance());

    expect(result.current).toBeNull();
    expect(mockUseAssetBalances).toHaveBeenCalledWith([]);
  });

  it('returns null when primaryAsset is null', () => {
    mockUseSelector.mockReturnValue({ primaryAsset: null });

    const { result } = renderHook(() => useCardPrimaryAssetBalance());

    expect(result.current).toBeNull();
    expect(mockUseAssetBalances).toHaveBeenCalledWith([]);
  });

  it('returns balance data when primaryAsset exists and map has matching key', () => {
    mockUseSelector.mockReturnValue({ primaryAsset: mockAsset });
    const key = '0xusdcaddress-eip155:59144-0xwalletaddr';
    mockUseAssetBalances.mockReturnValue(new Map([[key, mockBalanceEntry]]));

    const { result } = renderHook(() => useCardPrimaryAssetBalance());

    expect(result.current).toEqual(mockBalanceEntry);
    expect(mockToCardTokenAllowance).toHaveBeenCalledWith(mockAsset);
    expect(mockUseAssetBalances).toHaveBeenCalledWith([mockLegacyToken]);
  });

  it('returns null when balance map has no matching key', () => {
    mockUseSelector.mockReturnValue({ primaryAsset: mockAsset });
    mockUseAssetBalances.mockReturnValue(new Map());

    const { result } = renderHook(() => useCardPrimaryAssetBalance());

    expect(result.current).toBeNull();
  });

  it('builds correct cache key with lowercase address and walletAddress', () => {
    const upperAsset = {
      ...mockAsset,
      address: '0xABCDEF',
      walletAddress: '0xFEDCBA',
    };
    mockUseSelector.mockReturnValue({ primaryAsset: upperAsset });

    const upperToken: CardTokenAllowance = {
      ...mockLegacyToken,
      address: '0xABCDEF',
      walletAddress: '0xFEDCBA',
    };
    mockToCardTokenAllowance.mockReturnValue(upperToken);

    const expectedKey = '0xabcdef-eip155:59144-0xfedcba';
    mockUseAssetBalances.mockReturnValue(
      new Map([[expectedKey, mockBalanceEntry]]),
    );

    const { result } = renderHook(() => useCardPrimaryAssetBalance());

    expect(result.current).toEqual(mockBalanceEntry);
  });
});
