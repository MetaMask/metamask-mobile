import { TransactionType } from '@metamask/transaction-controller';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransferRecipient } from '../transactions/useTransferRecipient';
import { useTokenContractAlert } from './useTokenContractAlert';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../transactions/useTransferRecipient');
jest.mock('../../../../hooks/useAsyncResult');
jest.mock('../../utils/token');

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn().mockReturnValue('mainnet'),
    },
  },
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const mockUseTransactionMetadataRequest =
  useTransactionMetadataRequest as jest.Mock;
const mockUseTransferRecipient = useTransferRecipient as jest.Mock;
const mockUseAsyncResult = useAsyncResult as jest.Mock;

describe('useTokenContractAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);
    mockUseTransferRecipient.mockReturnValue(undefined);
    mockUseAsyncResult.mockReturnValue({ value: false });
  });

  it('returns empty array when transaction metadata is undefined', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);

    const { result } = renderHookWithProvider(() => useTokenContractAlert());

    expect(result.current).toEqual([]);
  });

  it('returns empty array when transaction type is not a transfer type', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.contractInteraction,
      chainId: '0x1',
    });
    mockUseTransferRecipient.mockReturnValue(
      '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
    );
    mockUseAsyncResult.mockReturnValue({ value: false });

    const { result } = renderHookWithProvider(() => useTokenContractAlert());

    expect(result.current).toEqual([]);
  });

  it('returns empty array when recipient is undefined', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.simpleSend,
      chainId: '0x1',
    });
    mockUseTransferRecipient.mockReturnValue(undefined);
    mockUseAsyncResult.mockReturnValue({ value: false });

    const { result } = renderHookWithProvider(() => useTokenContractAlert());

    expect(result.current).toEqual([]);
  });

  it('returns empty array when chainId is undefined', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.simpleSend,
      chainId: undefined,
    });
    mockUseTransferRecipient.mockReturnValue(
      '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
    );
    mockUseAsyncResult.mockReturnValue({ value: false });

    const { result } = renderHookWithProvider(() => useTokenContractAlert());

    expect(result.current).toEqual([]);
  });

  it('returns empty array when address is not a token contract', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.simpleSend,
      chainId: '0x1',
    });
    mockUseTransferRecipient.mockReturnValue(
      '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
    );
    mockUseAsyncResult.mockReturnValue({ value: false });

    const { result } = renderHookWithProvider(() => useTokenContractAlert());

    expect(result.current).toEqual([]);
  });

  it('returns empty array when token lookup throws an error', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.simpleSend,
      chainId: '0x1',
    });
    mockUseTransferRecipient.mockReturnValue(
      '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
    );
    mockUseAsyncResult.mockReturnValue({
      value: false,
      error: new Error('Network error'),
    });

    const { result } = renderHookWithProvider(() => useTokenContractAlert());

    expect(result.current).toEqual([]);
  });

  it('returns alert when recipient is a token contract for simpleSend', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.simpleSend,
      chainId: '0x1',
    });
    mockUseTransferRecipient.mockReturnValue(
      '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
    );
    mockUseAsyncResult.mockReturnValue({ value: true });

    const { result } = renderHookWithProvider(() => useTokenContractAlert());

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      key: AlertKeys.TokenContractAddress,
      field: RowAlertKey.InteractingWith,
      severity: Severity.Warning,
      isBlocking: false,
    });
    expect(result.current[0].title).toBeDefined();
    expect(result.current[0].message).toBeDefined();
  });

  it('returns alert when recipient is a token contract for tokenMethodTransfer', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.tokenMethodTransfer,
      chainId: '0x1',
    });
    mockUseTransferRecipient.mockReturnValue(
      '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
    );
    mockUseAsyncResult.mockReturnValue({ value: true });

    const { result } = renderHookWithProvider(() => useTokenContractAlert());

    expect(result.current).toHaveLength(1);
    expect(result.current[0].key).toBe(AlertKeys.TokenContractAddress);
  });

  it('returns alert when recipient is a token contract for tokenMethodTransferFrom', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.tokenMethodTransferFrom,
      chainId: '0x1',
    });
    mockUseTransferRecipient.mockReturnValue(
      '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
    );
    mockUseAsyncResult.mockReturnValue({ value: true });

    const { result } = renderHookWithProvider(() => useTokenContractAlert());

    expect(result.current).toHaveLength(1);
    expect(result.current[0].key).toBe(AlertKeys.TokenContractAddress);
  });

  it('passes correct async callback to useAsyncResult', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.simpleSend,
      chainId: '0x1',
    });
    mockUseTransferRecipient.mockReturnValue(
      '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
    );
    mockUseAsyncResult.mockReturnValue({ value: false });

    renderHookWithProvider(() => useTokenContractAlert());

    expect(mockUseAsyncResult).toHaveBeenCalledWith(expect.any(Function), [
      true,
      '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
      '0x1',
    ]);
  });

  it('returns non-blocking warning alert with correct structure', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.simpleSend,
      chainId: '0x1',
    });
    mockUseTransferRecipient.mockReturnValue(
      '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
    );
    mockUseAsyncResult.mockReturnValue({ value: true });

    const { result } = renderHookWithProvider(() => useTokenContractAlert());

    const alert = result.current[0];
    expect(alert.isBlocking).toBe(false);
    expect(alert.severity).toBe(Severity.Warning);
    expect(alert.field).toBe(RowAlertKey.InteractingWith);
  });
});
