import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
// eslint-disable-next-line import/no-namespace
import * as TransactionsSelectors from '../../../../../selectors/smartTransactionsController';
import { useIsGaslessSupported } from './useIsGaslessSupported';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { transferTransactionStateMock } from '../../__mocks__/transfer-transaction-mock';

jest.mock('../transactions/useTransactionMetadataRequest');

describe('useIsGaslessSupported', () => {
  const selectSmartTransactionsEnabledMock = jest
    .spyOn(TransactionsSelectors, 'selectSmartTransactionsEnabled')
    .mockReturnValue(true);
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isSupported and isSmartTransaction as true when smart transactions are enabled', () => {
    const mockChainId = '0x1';

    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: mockChainId,
    } as unknown as ReturnType<typeof useTransactionMetadataRequest>);

    const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
      state: transferTransactionStateMock,
    });

    expect(result.current).toEqual({
      isSupported: true,
      isSmartTransaction: true,
    });
  });

  it('returns isSupported and isSmartTransaction as false when smart transactions are disabled', () => {
    const mockChainId = '0x1';

    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: mockChainId,
    } as unknown as ReturnType<typeof useTransactionMetadataRequest>);

    selectSmartTransactionsEnabledMock.mockReturnValue(false);

    const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
      state: transferTransactionStateMock,
    });

    expect(result.current).toEqual({
      isSupported: false,
      isSmartTransaction: false,
    });
  });

  it('returns isSupported and isSmartTransaction as false when chainId is undefined', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);

    selectSmartTransactionsEnabledMock.mockReturnValue(false);

    const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
      state: transferTransactionStateMock,
    });

    expect(result.current).toEqual({
      isSupported: false,
      isSmartTransaction: false,
    });
  });

  it('returns isSupported and isSmartTransaction as false when transactionMeta is null', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);

    selectSmartTransactionsEnabledMock.mockReturnValue(false);

    const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
      state: transferTransactionStateMock,
    });

    expect(result.current).toEqual({
      isSupported: false,
      isSmartTransaction: false,
    });
  });
});
