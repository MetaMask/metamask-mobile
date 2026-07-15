import { TransactionType } from '@metamask/transaction-controller';
import { waitFor } from '@testing-library/react-native';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { memoizedGetTokenStandardAndDetails } from '../../utils/token';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransferRecipient } from '../transactions/useTransferRecipient';
import { useTokenContractAlert } from './useTokenContractAlert';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../transactions/useTransferRecipient');
jest.mock('../../utils/token');

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn().mockReturnValue('mainnet'),
    },
  },
}));

jest.mock('../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../util/address'),
  toChecksumAddress: jest.fn((addr: string) => addr),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const mockUseTransactionMetadataRequest =
  useTransactionMetadataRequest as jest.Mock;
const mockUseTransferRecipient = useTransferRecipient as jest.Mock;
const mockGetTokenDetails =
  memoizedGetTokenStandardAndDetails as unknown as jest.Mock;

describe('useTokenContractAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);
    mockUseTransferRecipient.mockReturnValue(undefined);
    mockGetTokenDetails.mockResolvedValue(undefined);
  });

  it('returns empty array when transaction metadata is undefined', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);

    const { result } = renderHookWithProvider(() => useTokenContractAlert());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it('returns empty array when transaction type is not a transfer type', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.contractInteraction,
      chainId: '0x1',
    });
    mockUseTransferRecipient.mockReturnValue(
      '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
    );

    const { result } = renderHookWithProvider(() => useTokenContractAlert());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it('returns empty array when recipient is undefined', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.simpleSend,
      chainId: '0x1',
    });
    mockUseTransferRecipient.mockReturnValue(undefined);

    const { result } = renderHookWithProvider(() => useTokenContractAlert());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it('returns empty array when chainId is undefined', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.simpleSend,
      chainId: undefined,
    });
    mockUseTransferRecipient.mockReturnValue(
      '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
    );

    const { result } = renderHookWithProvider(() => useTokenContractAlert());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it('returns empty array when address is not a token contract', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.simpleSend,
      chainId: '0x1',
    });
    mockUseTransferRecipient.mockReturnValue(
      '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
    );
    mockGetTokenDetails.mockResolvedValue(undefined);

    const { result } = renderHookWithProvider(() => useTokenContractAlert());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it('returns empty array when token lookup throws an error', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.simpleSend,
      chainId: '0x1',
    });
    mockUseTransferRecipient.mockReturnValue(
      '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
    );
    mockGetTokenDetails.mockRejectedValue(new Error('Network error'));

    const { result } = renderHookWithProvider(() => useTokenContractAlert());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it('returns alert when recipient is a token contract for simpleSend', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.simpleSend,
      chainId: '0x1',
    });
    mockUseTransferRecipient.mockReturnValue(
      '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
    );
    mockGetTokenDetails.mockResolvedValue({ standard: 'ERC20' });

    const { result } = renderHookWithProvider(() => useTokenContractAlert());

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
    });
    expect(result.current[0]).toMatchObject({
      key: AlertKeys.TokenContractAddress,
      field: RowAlertKey.InteractingWith,
      severity: Severity.Warning,
      isBlocking: false,
    });
    expect(result.current[0].title).toBeDefined();
    expect(result.current[0].message).toBeDefined();
  });

  it('returns alert when recipient is a token contract for tokenMethodTransfer', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.tokenMethodTransfer,
      chainId: '0x1',
    });
    mockUseTransferRecipient.mockReturnValue(
      '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
    );
    mockGetTokenDetails.mockResolvedValue({ standard: 'ERC20' });

    const { result } = renderHookWithProvider(() => useTokenContractAlert());

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
    });
    expect(result.current[0].key).toBe(AlertKeys.TokenContractAddress);
  });

  it('returns alert when recipient is a token contract for tokenMethodTransferFrom', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.tokenMethodTransferFrom,
      chainId: '0x1',
    });
    mockUseTransferRecipient.mockReturnValue(
      '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
    );
    mockGetTokenDetails.mockResolvedValue({ standard: 'ERC20' });

    const { result } = renderHookWithProvider(() => useTokenContractAlert());

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
    });
    expect(result.current[0].key).toBe(AlertKeys.TokenContractAddress);
  });

  it('returns empty array when token has no standard field', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.simpleSend,
      chainId: '0x1',
    });
    mockUseTransferRecipient.mockReturnValue(
      '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
    );
    mockGetTokenDetails.mockResolvedValue({ name: 'SomeToken' });

    const { result } = renderHookWithProvider(() => useTokenContractAlert());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it('calls memoizedGetTokenStandardAndDetails with checksummed address', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.simpleSend,
      chainId: '0x1',
    });
    mockUseTransferRecipient.mockReturnValue(
      '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
    );
    mockGetTokenDetails.mockResolvedValue(undefined);

    renderHookWithProvider(() => useTokenContractAlert());

    await waitFor(() => {
      expect(mockGetTokenDetails).toHaveBeenCalledWith({
        tokenAddress: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
        networkClientId: 'mainnet',
      });
    });
  });

  it('returns non-blocking warning alert with correct structure', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.simpleSend,
      chainId: '0x1',
    });
    mockUseTransferRecipient.mockReturnValue(
      '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
    );
    mockGetTokenDetails.mockResolvedValue({ standard: 'ERC721' });

    const { result } = renderHookWithProvider(() => useTokenContractAlert());

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
    });
    const alert = result.current[0];
    expect(alert.isBlocking).toBe(false);
    expect(alert.severity).toBe(Severity.Warning);
    expect(alert.field).toBe(RowAlertKey.InteractingWith);
  });
});
