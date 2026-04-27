import { renderHook } from '@testing-library/react-hooks';
import { Hex } from '@metamask/utils';
import { useHasInsufficientBalance } from './useHasInsufficientBalance';

import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { useAccountNativeBalance } from './useAccountNativeBalance';
import { useTransactionAccountOverride } from './transactions/useTransactionAccountOverride';
import { useTransactionPayIsPostQuote } from './pay/useTransactionPayData';
import { TransactionMeta } from '@metamask/transaction-controller';

jest.mock('./transactions/useTransactionMetadataRequest');
jest.mock('../../../../selectors/networkController');
jest.mock('./useAccountNativeBalance');
jest.mock('./transactions/useTransactionAccountOverride');
jest.mock('./pay/useTransactionPayData');

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
  const mockUseTransactionAccountOverride = jest.mocked(
    useTransactionAccountOverride,
  );
  const mockUseTransactionPayIsPostQuote = jest.mocked(
    useTransactionPayIsPostQuote,
  );

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

    mockUseTransactionAccountOverride.mockReturnValue(undefined);
    mockUseTransactionPayIsPostQuote.mockReturnValue(false);
  });

  it('uses accountOverride address when defined', () => {
    const overrideAddress = '0xOverride' as Hex;
    mockUseTransactionAccountOverride.mockReturnValue(overrideAddress);
    mockUseAccountNativeBalance.mockReturnValue({
      balanceWeiInHex: '0xC',
    } as unknown as ReturnType<typeof useAccountNativeBalance>);

    renderHook(() => useHasInsufficientBalance());

    expect(mockUseAccountNativeBalance).toHaveBeenCalledWith(
      mockChainId,
      overrideAddress,
    );
  });

  it('falls back to txParams.from when accountOverride is undefined', () => {
    mockUseTransactionAccountOverride.mockReturnValue(undefined);
    mockUseAccountNativeBalance.mockReturnValue({
      balanceWeiInHex: '0xC',
    } as unknown as ReturnType<typeof useAccountNativeBalance>);

    renderHook(() => useHasInsufficientBalance());

    expect(mockUseAccountNativeBalance).toHaveBeenCalledWith(
      mockChainId,
      mockFromAddress,
    );
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

  it('returns insufficient = true for Tempo if `excludeNativeTokenForFee` is true', () => {
    mockUseAccountNativeBalance.mockReturnValue({
      balanceWeiInHex: '0xC',
    } as unknown as ReturnType<typeof useAccountNativeBalance>);
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...baseTx,
      chainId: '0x1079',
      excludeNativeTokenForFee: true,
    } as unknown as TransactionMeta);
    const { result } = renderHook(() => useHasInsufficientBalance());
    expect(result.current.hasInsufficientBalance).toBe(true);
    expect(result.current.nativeCurrency).toBe('pathUSD');
  });

  it('returns insufficient = false for Tempo if `excludeNativeTokenForFee` is unset', () => {
    mockUseAccountNativeBalance.mockReturnValue({
      balanceWeiInHex: '0xC',
    } as unknown as ReturnType<typeof useAccountNativeBalance>);
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...baseTx,
      chainId: '0x1079',
    } as unknown as TransactionMeta);
    const { result } = renderHook(() => useHasInsufficientBalance());
    expect(result.current.hasInsufficientBalance).toBe(false);
    expect(result.current.nativeCurrency).toBe('pathUSD');
  });

  it('returns insufficient = true for Tempo Testnet if `excludeNativeTokenForFee` is true', () => {
    mockUseAccountNativeBalance.mockReturnValue({
      balanceWeiInHex: '0xC',
    } as unknown as ReturnType<typeof useAccountNativeBalance>);
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...baseTx,
      chainId: '0xa5bf',
      excludeNativeTokenForFee: true,
    } as unknown as TransactionMeta);
    const { result } = renderHook(() => useHasInsufficientBalance());
    expect(result.current.hasInsufficientBalance).toBe(true);
    expect(result.current.nativeCurrency).toBe('pathUSD');
  });

  it('returns insufficient = false for Tempo Testnet if `excludeNativeTokenForFee` is unset', () => {
    mockUseAccountNativeBalance.mockReturnValue({
      balanceWeiInHex: '0xC',
    } as unknown as ReturnType<typeof useAccountNativeBalance>);
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...baseTx,
      chainId: '0xa5bf',
    } as unknown as TransactionMeta);
    const { result } = renderHook(() => useHasInsufficientBalance());
    expect(result.current.hasInsufficientBalance).toBe(false);
    expect(result.current.nativeCurrency).toBe('pathUSD');
  });

  // Money account withdraw and similar post-quote + account-override flows
  // settle the token via the quote provider, so `txParams.value` is not
  // spent from the overridden account's native balance.
  it('excludes txParams.value from the check when accountOverride is set and isPostQuote is true', () => {
    mockUseTransactionAccountOverride.mockReturnValue('0xOverride' as Hex);
    mockUseTransactionPayIsPostQuote.mockReturnValue(true);
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...baseTx,
      txParams: {
        ...baseTx.txParams,
        value: '0x64',
      },
    } as unknown as TransactionMeta);
    mockUseAccountNativeBalance.mockReturnValue({
      balanceWeiInHex: '0x8',
    } as unknown as ReturnType<typeof useAccountNativeBalance>);

    const { result } = renderHook(() => useHasInsufficientBalance());
    expect(result.current.hasInsufficientBalance).toBe(false);
  });

  it('includes txParams.value in the check when isPostQuote is true but accountOverride is unset', () => {
    mockUseTransactionAccountOverride.mockReturnValue(undefined);
    mockUseTransactionPayIsPostQuote.mockReturnValue(true);
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...baseTx,
      txParams: {
        ...baseTx.txParams,
        value: '0x64',
      },
    } as unknown as TransactionMeta);
    mockUseAccountNativeBalance.mockReturnValue({
      balanceWeiInHex: '0x8',
    } as unknown as ReturnType<typeof useAccountNativeBalance>);

    const { result } = renderHook(() => useHasInsufficientBalance());
    expect(result.current.hasInsufficientBalance).toBe(true);
  });

  it('includes txParams.value in the check when accountOverride is set but isPostQuote is false', () => {
    mockUseTransactionAccountOverride.mockReturnValue('0xOverride' as Hex);
    mockUseTransactionPayIsPostQuote.mockReturnValue(false);
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...baseTx,
      txParams: {
        ...baseTx.txParams,
        value: '0x64',
      },
    } as unknown as TransactionMeta);
    mockUseAccountNativeBalance.mockReturnValue({
      balanceWeiInHex: '0x8',
    } as unknown as ReturnType<typeof useAccountNativeBalance>);

    const { result } = renderHook(() => useHasInsufficientBalance());
    expect(result.current.hasInsufficientBalance).toBe(true);
  });
});
