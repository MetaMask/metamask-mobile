import { renderHook } from '@testing-library/react-native';
import { useTokenActions } from './useTokenActions';
import {
  useHandleOnBuy,
  useHandleOnReceive,
  useHandleOnSend,
} from './useTokenAtomicActions';
import { TokenI } from '../../Tokens/types';

const mockOnBuy = jest.fn();
const mockOnSend = jest.fn();
const mockOnReceive = jest.fn();

jest.mock('./useTokenAtomicActions', () => ({
  useHandleOnBuy: jest.fn(),
  useHandleOnSend: jest.fn(),
  useHandleOnReceive: jest.fn(),
}));

const mockUseHandleOnBuy = jest.mocked(useHandleOnBuy);
const mockUseHandleOnSend = jest.mocked(useHandleOnSend);
const mockUseHandleOnReceive = jest.mocked(useHandleOnReceive);

// useTokenActions is a thin wrapper around the atomic hooks.
// More in-depth tests are in the atomic action tests.
describe('useTokenActions', () => {
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
    mockUseHandleOnSend.mockReturnValue(mockOnSend);
    mockUseHandleOnReceive.mockReturnValue(mockOnReceive);
  });

  it('returns the action handlers from the atomic hooks', () => {
    const { result } = renderHook(() =>
      useTokenActions({
        token: defaultToken,
        networkName: 'Ethereum Mainnet',
      }),
    );

    expect(result.current.onBuy).toBe(mockOnBuy);
    expect(result.current.onSend).toBe(mockOnSend);
    expect(result.current.onReceive).toBe(mockOnReceive);

    // make sure that each hook handler passed the token
    expect(mockUseHandleOnBuy).toHaveBeenCalledWith({ token: defaultToken });
    expect(mockUseHandleOnSend).toHaveBeenCalledWith({ token: defaultToken });
    expect(mockUseHandleOnReceive).toHaveBeenCalledWith({
      token: defaultToken,
      networkName: 'Ethereum Mainnet',
    });
  });
});
