import { renderHook } from '@testing-library/react-hooks';
import { Hex } from '@metamask/utils';
import { useHasInsufficientBalance } from './useHasInsufficientBalance';

import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { useAccountNativeBalance } from './useAccountNativeBalance';
import { TransactionMeta } from '@metamask/transaction-controller';

jest.mock('./transactions/useTransactionMetadataRequest');
jest.mock('../../../../selectors/networkController');
jest.mock('./useAccountNativeBalance');

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockImplementation((selector) => selector()),
}));

describe('useHasInsufficientBalance', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );
  const mockSelectNetworkConfigurations = jest.mocked(
    selectNetworkConfigurations,
  );
  const mockUseAccountNativeBalance = jest.mocked(useAccountNativeBalance);

  const mockChainId = '0x1' as Hex;
  const mockFromAddress = '0xabc';
  const nativeCurrency = 'ETH';

  const baseTx = {
    chainId: mockChainId,
    txParams: {
      from: mockFromAddress,
      value: '0x5',
      gas: '0x2',
      maxFeePerGas: '0x3',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTransactionMetadataRequest.mockReturnValue(
      baseTx as unknown as TransactionMeta,
    );

    mockSelectNetworkConfigurations.mockReturnValue({
      [mockChainId]: {
        nativeCurrency,
      },
    } as unknown as ReturnType<typeof selectNetworkConfigurations>);

    mockUseAccountNativeBalance.mockReturnValue({
      balanceWeiInHex: '0xA',
    } as unknown as ReturnType<typeof useAccountNativeBalance>);
  });

  it('returns insufficient = false when balance is enough', () => {
    mockUseAccountNativeBalance.mockReturnValue({
      balanceWeiInHex: '0xC',
    } as unknown as ReturnType<typeof useAccountNativeBalance>);

    const { result } = renderHook(() => useHasInsufficientBalance());
    expect(result.current.hasInsufficientBalance).toBe(false);
    expect(result.current.nativeCurrency).toBe(nativeCurrency);
  });

  it('returns insufficient = true when balance is too low', () => {
    mockUseAccountNativeBalance.mockReturnValue({
      balanceWeiInHex: '0xA',
    } as unknown as ReturnType<typeof useAccountNativeBalance>);

    const { result } = renderHook(() => useHasInsufficientBalance());
    expect(result.current.hasInsufficientBalance).toBe(true);
  });

  it('uses gasPrice when maxFeePerGas is missing', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...baseTx,
      txParams: {
        ...baseTx.txParams,
        maxFeePerGas: undefined,
        gasPrice: '0x2',
      },
    } as unknown as TransactionMeta);

    mockUseAccountNativeBalance.mockReturnValue({
      balanceWeiInHex: '0x8',
    } as unknown as ReturnType<typeof useAccountNativeBalance>);

    const { result } = renderHook(() => useHasInsufficientBalance());
    expect(result.current.hasInsufficientBalance).toBe(true);
  });

  it('returns true when balance is missing', () => {
    mockUseAccountNativeBalance.mockReturnValue({
      balanceWeiInHex: undefined,
    } as unknown as ReturnType<typeof useAccountNativeBalance>);

    const { result } = renderHook(() => useHasInsufficientBalance());
    expect(result.current.hasInsufficientBalance).toBe(true);
  });

  it('returns false when transaction has no value and gas is covered', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...baseTx,
      txParams: {
        ...baseTx.txParams,
        value: '0x0',
      },
    } as unknown as TransactionMeta);

    mockUseAccountNativeBalance.mockReturnValue({
      balanceWeiInHex: '0xA',
    } as unknown as ReturnType<typeof useAccountNativeBalance>);

    const { result } = renderHook(() => useHasInsufficientBalance());
    expect(result.current.hasInsufficientBalance).toBe(false);
  });

  it('returns nativeCurrency correctly', () => {
    const { result } = renderHook(() => useHasInsufficientBalance());
    expect(result.current.nativeCurrency).toBe('ETH');
  });
});
