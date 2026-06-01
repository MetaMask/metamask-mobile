import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useStickyTokenActions } from './useStickyTokenActions';
import { useHandleOnBuy, useHandleOnSwap } from './useTokenAtomicActions';
import { useAddNetwork } from '../../../hooks/useAddNetwork';
import { TokenI } from '../../Tokens/types';

const mockOnBuy = jest.fn();
const mockOnSwap = jest.fn();

jest.mock('./useTokenAtomicActions', () => ({
  useHandleOnBuy: jest.fn(),
  useHandleOnSwap: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../hooks/useAddNetwork', () => ({
  useAddNetwork: jest.fn(),
}));

const mockUseHandleOnBuy = jest.mocked(useHandleOnBuy);
const mockUseHandleOnSwap = jest.mocked(useHandleOnSwap);
const mockUseAddNetwork = jest.mocked(useAddNetwork);
const mockUseSelector = jest.mocked(useSelector);

// useStickyTokenActions is a thin wrapper around the atomic hooks (plus swap eligibility + network UI).
// More in-depth tests are in the atomic action tests.
describe('useStickyTokenActions', () => {
  const defaultToken: TokenI = {
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    chainId: '0x1',
    symbol: 'DAI',
    decimals: 18,
    name: 'Dai Stablecoin',
    image: 'https://example.com/dai.png',
    isETH: false,
    isNative: false,
  } as TokenI;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHandleOnBuy.mockReturnValue(mockOnBuy);
    mockUseHandleOnSwap.mockReturnValue(mockOnSwap);
    mockUseAddNetwork.mockReturnValue({
      networkModal: null,
    } as unknown as ReturnType<typeof useAddNetwork>);
    mockUseSelector.mockReturnValue(true);
  });

  it('returns sticky-footer handlers, swap eligibility, and network modal from composed hooks', () => {
    const { result } = renderHook(() =>
      useStickyTokenActions({
        token: defaultToken,
        currentTokenBalance: '1.25',
        sourcePage: 'TokenDetails',
      }),
    );

    expect(result.current.onBuy).toBe(mockOnBuy);
    expect(result.current.onSwap).toBe(mockOnSwap);
    expect(result.current.hasEligibleSwapTokens).toBe(true);
    expect(result.current.networkModal).toBeNull();

    expect(mockUseHandleOnBuy).toHaveBeenCalledWith({ token: defaultToken });
    expect(mockUseHandleOnSwap).toHaveBeenCalledWith({
      token: defaultToken,
      currentTokenBalance: '1.25',
      sourcePage: 'TokenDetails',
    });
  });
});
