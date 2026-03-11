import { renderHook } from '@testing-library/react-hooks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { isNativeAddress } from '@metamask/bridge-controller';
import { useSelector } from 'react-redux';
import { useShouldRenderMaxOption } from '.';
import { BridgeToken } from '../../types';
import { useTokenAddress } from '../useTokenAddress';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../useTokenAddress', () => ({
  useTokenAddress: jest.fn(),
}));

jest.mock('@metamask/bridge-controller', () => {
  const actual = jest.requireActual('@metamask/bridge-controller');
  return {
    ...actual,
    isNativeAddress: jest.fn(),
  };
});

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseTokenAddress = useTokenAddress as jest.MockedFunction<
  typeof useTokenAddress
>;
const mockIsNativeAddress = isNativeAddress as jest.MockedFunction<
  typeof isNativeAddress
>;

const mockToken: BridgeToken = {
  address: '0x1234567890123456789012345678901234567890',
  symbol: 'TEST',
  decimals: 18,
  chainId: CHAIN_IDS.MAINNET,
};

const nativeToken: BridgeToken = {
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  decimals: 18,
  chainId: CHAIN_IDS.MAINNET,
};

const setSelectorValues = ({
  gasIncluded = false,
  gasIncluded7702 = false,
  stxEnabled = true,
}: {
  gasIncluded?: boolean;
  gasIncluded7702?: boolean;
  stxEnabled?: boolean;
} = {}) => {
  let selectorCallCount = 0;
  mockUseSelector.mockImplementation(() => {
    selectorCallCount += 1;
    return selectorCallCount % 2 === 1
      ? { gasIncluded, gasIncluded7702 }
      : stxEnabled;
  });
};

describe('useShouldRenderMaxOption', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    setSelectorValues();
    mockUseTokenAddress.mockReturnValue(mockToken.address);
    mockIsNativeAddress.mockReturnValue(false);
  });

  it('returns false when token is undefined', () => {
    const { result } = renderHook(() =>
      useShouldRenderMaxOption(undefined, '10'),
    );

    expect(result.current).toBe(false);
  });

  it('returns false when display balance is zero', () => {
    const { result } = renderHook(() =>
      useShouldRenderMaxOption(mockToken, '0'),
    );

    expect(result.current).toBe(false);
  });

  it('returns true for non-native token with positive balance', () => {
    mockIsNativeAddress.mockReturnValue(false);

    const { result } = renderHook(() =>
      useShouldRenderMaxOption(mockToken, '10'),
    );

    expect(result.current).toBe(true);
  });

  it('returns true for native token when gasIncluded is enabled', () => {
    setSelectorValues({ gasIncluded: true, stxEnabled: true });
    mockUseTokenAddress.mockReturnValue(nativeToken.address);
    mockIsNativeAddress.mockReturnValue(true);

    const { result } = renderHook(() =>
      useShouldRenderMaxOption(nativeToken, '1.25'),
    );

    expect(result.current).toBe(true);
  });

  it('returns true for native token when 7702 is enabled', () => {
    setSelectorValues({
      gasIncluded: false,
      gasIncluded7702: true,
      stxEnabled: false,
    });
    mockUseTokenAddress.mockReturnValue(nativeToken.address);
    mockIsNativeAddress.mockReturnValue(true);

    const { result } = renderHook(() =>
      useShouldRenderMaxOption(nativeToken, '1.25'),
    );

    expect(result.current).toBe(true);
  });

  it('returns false for native token when gasIncluded and 7702 are both disabled', () => {
    setSelectorValues({
      gasIncluded: false,
      gasIncluded7702: false,
      stxEnabled: true,
    });
    mockUseTokenAddress.mockReturnValue(nativeToken.address);
    mockIsNativeAddress.mockReturnValue(true);

    const { result } = renderHook(() =>
      useShouldRenderMaxOption(nativeToken, '1.25'),
    );

    expect(result.current).toBe(false);
  });

  it('returns true for sponsored native quote when stx is enabled', () => {
    setSelectorValues({
      gasIncluded: false,
      gasIncluded7702: false,
      stxEnabled: true,
    });
    mockUseTokenAddress.mockReturnValue(nativeToken.address);
    mockIsNativeAddress.mockReturnValue(true);

    const { result } = renderHook(() =>
      useShouldRenderMaxOption(nativeToken, '1.25', true),
    );

    expect(result.current).toBe(true);
  });

  it('returns false for sponsored native quote when stx is disabled', () => {
    setSelectorValues({
      gasIncluded: false,
      gasIncluded7702: false,
      stxEnabled: false,
    });
    mockUseTokenAddress.mockReturnValue(nativeToken.address);
    mockIsNativeAddress.mockReturnValue(true);

    const { result } = renderHook(() =>
      useShouldRenderMaxOption(nativeToken, '1.25', true),
    );

    expect(result.current).toBe(false);
  });

  it('returns false for non-EVM native token when no gas-included path is enabled', () => {
    const solanaToken: BridgeToken = {
      ...nativeToken,
      chainId:
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as `${string}:${string}`,
    };
    setSelectorValues({
      gasIncluded: false,
      gasIncluded7702: false,
      stxEnabled: false,
    });
    mockUseTokenAddress.mockReturnValue(solanaToken.address);
    mockIsNativeAddress.mockReturnValue(true);

    const { result } = renderHook(() =>
      useShouldRenderMaxOption(solanaToken, '3'),
    );

    expect(result.current).toBe(false);
  });
});
