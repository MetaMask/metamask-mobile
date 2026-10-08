import BN from 'bnjs4';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { evmSendStateMock, SOLANA_ASSET } from '../../__mocks__/send.mock';
import { useSendContext } from '../../context/send-context';
import { usePercentageAmount } from './usePercentageAmount';
import { useBalance } from './useBalance';
import { useParams } from '../../../../../util/navigation/navUtils';

const NATIVE_ASSET = {
  chainId: '0x1',
  address: '0xeDd1935e28b253C7905Cf5a944f0B5830FFA916a',
  decimals: 2,
  isNative: true,
};

jest.mock('@metamask/assets-controllers', () => ({
  getNativeTokenAddress: () => '0xeDd1935e28b253C7905Cf5a944f0B5830FFA916a',
}));

jest.mock('../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

jest.mock('./useBalance', () => ({
  useBalance: jest.fn(),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

const mockState = {
  state: evmSendStateMock,
};

const mockUseSendContext = jest.mocked(useSendContext);
const mockUseBalance = jest.mocked(useBalance);
const mockUseParams = jest.mocked(useParams);

const setBalance = (rawBalance: string, decimals = 2) => {
  mockUseBalance.mockReturnValue({
    balance: rawBalance,
    decimals,
    rawBalanceBN: new BN(rawBalance),
  });
};

describe('usePercentageAmount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue(undefined);
  });

  it('returns the percentage of the balance for a token', () => {
    mockUseSendContext.mockReturnValue({
      asset: { chainId: '0x1', decimals: 2 },
    } as unknown as ReturnType<typeof useSendContext>);
    setBalance('1000');

    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );

    expect(result.current.isMaxAmountSupported).toBe(true);
    expect(result.current.getPercentageAmount(100)).toBe('10');
    expect(result.current.getPercentageAmount(75)).toBe('7.5');
    expect(result.current.getPercentageAmount(25)).toBe('2.5');
  });

  it('returns the full balance as Max for an EVM native asset', () => {
    mockUseSendContext.mockReturnValue({
      asset: NATIVE_ASSET,
    } as unknown as ReturnType<typeof useSendContext>);
    setBalance('1000000000000000');

    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );

    expect(result.current.isMaxAmountSupported).toBe(true);
    expect(result.current.getPercentageAmount(100)).toBe('10000000000000');
    expect(result.current.getPercentageAmount(50)).toBe('5000000000000');
  });

  it('returns zero for an empty balance', () => {
    mockUseSendContext.mockReturnValue({
      asset: NATIVE_ASSET,
    } as unknown as ReturnType<typeof useSendContext>);
    setBalance('0');

    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );

    expect(result.current.getPercentageAmount(100)).toBe('0');
  });

  it('returns zero without an asset', () => {
    mockUseSendContext.mockReturnValue({
      asset: undefined,
    } as unknown as ReturnType<typeof useSendContext>);
    setBalance('1000');

    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );

    expect(result.current.getPercentageAmount(100)).toBe('0');
  });

  it('does not support Max for a non-EVM native asset', () => {
    mockUseSendContext.mockReturnValue({
      asset: SOLANA_ASSET,
    } as unknown as ReturnType<typeof useSendContext>);
    setBalance('10', 0);

    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );

    expect(result.current.isMaxAmountSupported).toBe(false);
    expect(result.current.getPercentageAmount(75)).toBe('0.000000000000000007');
    expect(result.current.getPercentageAmount(100)).toBeUndefined();
  });
});
