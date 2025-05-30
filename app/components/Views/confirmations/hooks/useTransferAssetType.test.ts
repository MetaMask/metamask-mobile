import { renderHook } from '@testing-library/react-hooks';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useTransferAssetType } from './useTransferAssetType';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { useAsyncResult } from '../../../hooks/useAsyncResult';
import { memoizedGetTokenStandardAndDetails } from '../utils/token';

jest.mock('../../../hooks/useAsyncResult');
jest.mock('../utils/token');
jest.mock('./transactions/useTransactionMetadataRequest');

const mockUseTransactionMetadataRequest =
  useTransactionMetadataRequest as jest.MockedFunction<
    typeof useTransactionMetadataRequest
  >;
const mockUseAsyncResult = useAsyncResult as jest.MockedFunction<
  typeof useAsyncResult
>;

describe('useTransferAssetType', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    memoizedGetTokenStandardAndDetails?.cache?.clear?.();
  });

  it('when transaction type is simpleSend returns native asset type', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.simpleSend,
      txParams: { to: '0x123' },
      networkClientId: 'mainnet',
    } as unknown as TransactionMeta);

    mockUseAsyncResult.mockReturnValue({ value: undefined, pending: false });

    const { result } = renderHook(() => useTransferAssetType());

    expect(result.current.assetType).toBe('native');
  });

  it('when transaction type is tokenMethodTransfer returns erc20 asset type', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.tokenMethodTransfer,
      txParams: { to: '0x123' },
      networkClientId: 'mainnet',
    } as unknown as TransactionMeta);

    mockUseAsyncResult.mockReturnValue({ value: undefined, pending: false });

    const { result } = renderHook(() => useTransferAssetType());

    expect(result.current.assetType).toBe('erc20');
  });

  describe('when transaction type is tokenMethodTransferFrom', () => {
    it('returns asset type based on token standard when details are available', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.tokenMethodTransferFrom,
        txParams: { to: '0x123' },
        networkClientId: 'mainnet',
      } as unknown as TransactionMeta);

      mockUseAsyncResult.mockReturnValue({
        value: { standard: 'ERC721' },
        pending: false,
      });

      const { result } = renderHook(() => useTransferAssetType());

      expect(result.current.assetType).toBe('erc721');
    });

    it('returns erc1155 when standard is ERC1155', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.tokenMethodTransferFrom,
        txParams: { to: '0x123' },
        networkClientId: 'mainnet',
      } as unknown as TransactionMeta);

      mockUseAsyncResult.mockReturnValue({
        value: { standard: 'ERC1155' },
        pending: false,
      });

      const { result } = renderHook(() => useTransferAssetType());

      expect(result.current.assetType).toBe('erc1155');
    });

    it('returns erc20 when standard is ERC20', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.tokenMethodTransferFrom,
        txParams: { to: '0x123' },
        networkClientId: 'mainnet',
      } as unknown as TransactionMeta);

      mockUseAsyncResult.mockReturnValue({
        value: { standard: 'ERC20' },
        pending: false,
      });

      const { result } = renderHook(() => useTransferAssetType());

      expect(result.current.assetType).toBe('erc20');
    });

    it('returns unknown when standard is invalid', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.tokenMethodTransferFrom,
        txParams: { to: '0x123' },
        networkClientId: 'mainnet',
      } as unknown as TransactionMeta);

      mockUseAsyncResult.mockReturnValue({
        value: { standard: 'INVALID_STANDARD' },
        pending: false,
      });

      const { result } = renderHook(() => useTransferAssetType());

      expect(result.current.assetType).toBe('unknown');
    });

    it('returns unknown when details are not available', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.tokenMethodTransferFrom,
        txParams: { to: '0x123' },
        networkClientId: 'mainnet',
      } as unknown as TransactionMeta);

      mockUseAsyncResult.mockReturnValue({
        value: undefined,
        pending: false,
      });

      const { result } = renderHook(() => useTransferAssetType());

      expect(result.current.assetType).toBe('unknown');
    });

    it('returns unknown when standard is not provided', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.tokenMethodTransferFrom,
        txParams: { to: '0x123' },
        networkClientId: 'mainnet',
      } as unknown as TransactionMeta);

      mockUseAsyncResult.mockReturnValue({
        value: { standard: undefined },
        pending: false,
      });

      const { result } = renderHook(() => useTransferAssetType());

      expect(result.current.assetType).toBe('unknown');
    });
  });

  it('when transaction type is tokenMethodSafeTransferFrom returns asset type based on token standard', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.tokenMethodSafeTransferFrom,
      txParams: { to: '0x123' },
      networkClientId: 'mainnet',
    } as unknown as TransactionMeta);

    mockUseAsyncResult.mockReturnValue({
      value: { standard: 'ERC721' },
      pending: false,
    });

    const { result } = renderHook(() => useTransferAssetType());

    expect(result.current.assetType).toBe('erc721');
  });

  describe('when transaction type is unknown or undefined', () => {
    it('returns unknown asset type for undefined transaction type', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: undefined,
        txParams: { to: '0x123' },
        networkClientId: 'mainnet',
      } as unknown as TransactionMeta);

      mockUseAsyncResult.mockReturnValue({ value: undefined, pending: false });

      const { result } = renderHook(() => useTransferAssetType());

      expect(result.current.assetType).toBe('unknown');
    });

    it('returns unknown asset type for unhandled transaction type', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: 'UNKNOWN_TYPE' as TransactionType,
        txParams: { to: '0x123' },
        networkClientId: 'mainnet',
      } as unknown as TransactionMeta);

      mockUseAsyncResult.mockReturnValue({ value: undefined, pending: false });

      const { result } = renderHook(() => useTransferAssetType());

      expect(result.current.assetType).toBe('unknown');
    });
  });

  it('when transaction metadata is not available returns unknown asset type', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);
    mockUseAsyncResult.mockReturnValue({ value: undefined, pending: false });

    const { result } = renderHook(() => useTransferAssetType());

    expect(result.current.assetType).toBe('unknown');
  });

  it('calls useAsyncResult with correct parameters', () => {
    const mockTransactionMetadata = {
      type: TransactionType.simpleSend,
      txParams: { to: '0x123' },
      networkClientId: 'mainnet',
    };

    mockUseTransactionMetadataRequest.mockReturnValue(
      mockTransactionMetadata as unknown as TransactionMeta,
    );
    mockUseAsyncResult.mockReturnValue({ value: undefined, pending: false });

    renderHook(() => useTransferAssetType());

    expect(mockUseAsyncResult).toHaveBeenCalledWith(expect.any(Function), [
      '0x123',
      'mainnet',
    ]);
  });

  it('handles mixed case token standards', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.tokenMethodTransferFrom,
      txParams: { to: '0x123' },
      networkClientId: 'mainnet',
    } as unknown as TransactionMeta);

    mockUseAsyncResult.mockReturnValue({
      value: { standard: 'eRc721' },
      pending: false,
    });

    const { result } = renderHook(() => useTransferAssetType());

    expect(result.current.assetType).toBe('erc721');
  });
});
